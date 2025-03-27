require("dotenv").config();
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
const { env } = require("process");
const stripe = require("stripe")(process.env.STRIPE_SERVER_KEY);

server.use(express.json()); // to parse req.body
//WebHook

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

//middlewares
server.use(express.static(path.resolve(__dirname, "build")));
server.use(cookieParser());
server.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);
server.use(passport.authenticate("session"));
server.use(
  cors({
    exposedHeaders: ["X-Total-Count"],
  })
);

server.use("/products", isAuth(), productsRouter.router);
server.use("/categories", isAuth(), categoriesRouter.router);
server.use("/brands", isAuth(), brandsRouter.router);
server.use("/user", isAuth(), userRouter.router);
server.use("/auth", authRouter.router);
server.use("/cart", isAuth(), cartRouter.router);
server.use("/order", isAuth(), orderRouter.router);

// this line we add to make react router work in case of other routes doesnt match
server.get("*", (req, res) =>
  res.sendFile(path.resolve("build", "index.html"))
);
// Passport Strategies

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
        }
      );
    } catch (err) {
      done(err);
    }
  })
);

passport.use(
  "jwt",
  new JwtStrategy(opts, async function (jwt_payload, done) {
    console.log("JwtStrategy is called");
    console.log({ jwt_payload });
    try {
      const user = await User.findById(jwt_payload.id);
      if (user) {
        return done(null, sanitizeUser(user)); // this calls serializer
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  })
);

// this creates session variable req.user on being called from callbacks
passport.serializeUser(function (user, cb) {
  console.log("serialize", user);
  process.nextTick(function () {
    return cb(null, { id: user.id, role: user.role });
  });
});

// this changes session variable req.user when called from authorized request

passport.deserializeUser(function (user, cb) {
  console.log("de-serialize", user);
  process.nextTick(function () {
    return cb(null, user);
  });
});

server.post("/create-payment-intent", async (req, res) => {
  const { TotalAmount, orderId, customerDetails } = req.body;

  try {
    // ✅ Create customer with actual details from frontend
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
      amount: TotalAmount * 100, // amount in paise
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

server.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
