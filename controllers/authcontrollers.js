const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sanitizeUser, sendMail } = require("../services/common");
const User = require("../models/User");

exports.CreateUser = async (req, res) => {
  console.log("createuser");
  try {
    const salt = crypto.randomBytes(16);
    console.log("Generated salt:", salt);

    crypto.pbkdf2(
      req.body.password,
      salt,
      310000,
      32,
      "sha256",
      async (err, derivedKey) => {
        if (err) {
          console.error("Error during password hashing:", err);
          return res
            .status(400)
            .json({ error: "Error during password hashing" });
        }

        const user = new User({ ...req.body, password: derivedKey, salt });
        console.log("User data:", user);

        const doc = await user.save();
        console.log("Saved user:", doc);

        req.login(sanitizeUser(doc), (err) => {
          if (err) {
            console.error("Error during login:", err);
            return res.status(400).json({ error: "Error during login" });
          } else {
            const token = jwt.sign(
              sanitizeUser(doc),
              process.env.JWT_SECERT_KEY
            );
            console.log("Generated token:", token);
            res
              .cookie("jwt", token, {
                expires: new Date(Date.now() + 3600000),
                httpOnly: true,
              })
              .status(201)
              .json({ id: doc.id, role: doc.role });
          }
        });
      }
    );
  } catch (err) {
    console.error("General error:", err);
    res.status(400).json({ error: "General error" });
  }
};

exports.loginUser = async (req, res) => {
  // const user = req.user;
  console.log('Login attempt - req.user:', req.user);
  const user = req.user;
  console.log('User data:', {
    id: user?.id,
    role: user?.role,
    token: user?.token
  });

  res
    .cookie("jwt", user.token, {
      expires: new Date(Date.now() + 3600000),
      httpOnly: true,
    })
    .status(201)
    .json({ id: user.id, role: user.role });
};

exports.checkAuth = async (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.sendStatus(401);
  }
};

exports.logout = async (req, res) => {
  res
    .cookie("jwt", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .sendStatus(200);
};

exports.resetPasswordRequest = async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne({ email: email });
  if (user) {
    const token = crypto.randomBytes(48).toString("hex");
    user.resetPasswordToken = token;
    await user.save();

    // Also set token in email
    const resetPageLink =
      "http://localhost:3000/reset-password?token=" + token + "&email=" + email;
    const subject = "reset password for ShopSphere";
    const html = `<p>Click <a href='${resetPageLink}'>here</a> to Reset Password</p>`;

    // lets send email and a token in the mail body so we can verify that user has clicked right link

    if (email) {
      const response = await sendMail({ to: email, subject, html });
      res.json(response);
    } else {
      res.sendStatus(400);
    }
  } else {
    res.sendStatus(400);
  }
};

exports.resetPassword = async (req, res) => {
  const { email, password, token } = req.body;

  const user = await User.findOne({ email: email, resetPasswordToken: token });
  if (user) {
    const salt = crypto.randomBytes(16);
    crypto.pbkdf2(
      req.body.password,
      salt,
      310000,
      32,
      "sha256",
      async function (err, hashedPassword) {
        user.password = hashedPassword;
        user.salt = salt;
        await user.save();
        const subject = "password successfully reset for ShopSphere";
        const html = `<p>Successfully able to Reset Password</p>`;
        if (email) {
          const response = await sendMail({ to: email, subject, html });
          res.json(response);
        } else {
          res.sendStatus(400);
        }
      }
    );
  } else {
    res.sendStatus(400);
  }
};
