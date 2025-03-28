require("dotenv").config();
const MongoStore = require("connect-mongo");
const express = require("express");
const server = express();
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const JwtStrategy = require("passport-jwt").Strategy;
const cookieParser = require("cookie-parser");
const productsRouter = require("./routes/productroutes");
const brandsRouter = require("./routes/brandroutes");
const categoriesRouter = require("./routes/categoryroutes");
const userRouter = require("./routes/userroutes");
const authRouter = require("./routes/authroutes");
const cartRouter = require("./routes/cartroutes");
const orderRouter = require("./routes/orderroutes");
const path = require("path");
const User = require("./models/User");
const { isAuth, sanitizeUser, cookieExtractor } = require("./services/common");
const Order = require("./models/Order");
const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);
// Middleware to parse JSON bodies
server.use(express.json());

// Webhook endpoint
const endpointSecret = process.env.ENDPOINT_SECRET;

server.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object;
        const order = await Order.findById(
          paymentIntentSucceeded.metadata.orderId
        );
        order.paymentStatus = "received";
        await order.save();
        // Then define and call a function to handle the event payment_intent.succeeded
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
  }
);

// JWT options
const opts = {};
opts.jwtFromRequest = cookieExtractor;
opts.secretOrKey = process.env.JWT_SECRET_KEY;
server.use(cors());

server.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true, // if using cookies
    exposedHeaders: ["X-Total-Count"],
  })
);

server.use(cookieParser());
server.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // ensures cookies are only sent over HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' for cross-site, 'lax' for local testing
      maxAge: 1000 * 60 * 60 * 24, // 1 day (adjust as needed)
    },
  })
);

server.use(passport.authenticate("session"));
// Routes
server.use("/products", isAuth(), productsRouter.router);
server.use("/categories", isAuth(), categoriesRouter.router);
server.use("/brands", isAuth(), brandsRouter.router);
server.use("/user", isAuth(), userRouter.router);
server.use("/auth", authRouter.router);
server.use("/cart", isAuth(), cartRouter.router);
server.use("/order", isAuth(), orderRouter.router);

// Passport Local Strategy
passport.use(
  "local",
  new LocalStrategy({ usernameField: "email" }, async function (
    email,
    password,
    done
  ) {
    // by default passport uses username
    console.log("LocalStrategy is called");
    try {
      const user = await User.findOne({ email: email });
      console.log(email, password, user);
      if (!user) {
        return done(null, false, { message: "invalid credentials" }); // for safety
      }
      crypto.pbkdf2(
        password,
        user.salt,
        310000,
        32,
        "sha256",
        async function (err, hashedPassword) {
          if (!crypto.timingSafeEqual(user.password, hashedPassword)) {
            return done(null, false, { message: "invalid credentials" });
          }
          const token = jwt.sign(
            sanitizeUser(user),
            process.env.JWT_SECRET_KEY
          );
          done(null, { id: user.id, role: user.role, token }); // this lines sends to serializer
        },
        crypto.pbkdf2(
          password,
          user.salt,
          310000,
          32,
          "sha256",
          async function (err, hashedPassword) {
            if (err || !crypto.timingSafeEqual(user.password, hashedPassword)) {
              return done(null, false, { message: "invalid credentials" });
            }
            const token = jwt.sign(
              sanitizeUser(user),
              process.env.JWT_SECRET_KEY
            );
            done(null, { id: user.id, role: user.role, token });
          }
        )
      );
    } catch (err) {
      done(err);
    }
  })
);

// Passport JWT Strategy
passport.use(
  "jwt",
  new JwtStrategy(opts, async (jwt_payload, done) => {
    console.log("JwtStrategy is called", { jwt_payload });
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        return done(null, sanitizeUser(user));
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

// Serialize user to session
passport.serializeUser((user, cb) => {
  console.log("serialize", user);
  process.nextTick(() => {
    return cb(null, { id: user.id, role: user.role });
  });
});

// Deserialize user from session
passport.deserializeUser((user, cb) => {
  console.log("de-serialize", user);
  process.nextTick(() => {
    return cb(null, user);
  });
});

server.post("/create-payment-intent", async (req, res) => {
  const { TotalAmount, orderId, customerDetails } = req.body;

  try {
    const customer = await stripe.customers.create({
      name: customerDetails?.name,
      email: customerDetails?.email,
      phone: customerDetails?.phone,
      address: {
        line1: customerDetails?.address?.line1,
        city: customerDetails?.address?.city,
        state: customerDetails?.address?.state,
        postal_code: customerDetails?.address?.postal_code,
        country: customerDetails?.address?.country || "IN",
      },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: TotalAmount * 100, // amount in smallest currency unit (e.g., paise)
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: { enabled: true },
      description: `Order #${orderId} payment for exported goods/services`,
      metadata: { orderId },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe PaymentIntent Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

main().catch((err) => console.log(err));

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

main().catch((err) => console.log(err));

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
