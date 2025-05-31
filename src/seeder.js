const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Load env vars
dotenv.config();

// Load models
const User = require("./models/User");
const Template = require("./models/Template");

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create admin user and system templates
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({ role: "admin" });
    await Template.deleteMany({ isSystem: true });

    // Create admin user
    const adminPassword = "admin123";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      company: "Email Tracker SaaS",
      isActive: true,
      emailQuota: 1000000,
      apiKey: crypto.randomBytes(32).toString("hex"),
    });

    // Create system templates
    const templates = [
      {
        name: "Welcome Email",
        description: "A template for welcoming new users",
        subject: "Welcome to {{company}}!",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome, {{name}}!</h2>
            <p>Thank you for joining {{company}}. We're excited to have you on board!</p>
            <p>Here are a few things you can do to get started:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Reach out if you need help</li>
            </ul>
            <p>If you have any questions, feel free to reply to this email.</p>
            <p>Best regards,<br>The {{company}} Team</p>
          </div>
        `,
        category: "welcome",
        isSystem: true,
        variables: [
          {
            name: "name",
            defaultValue: "there",
            description: "Recipient's name",
          },
          {
            name: "company",
            defaultValue: "Our Company",
            description: "Company name",
          },
        ],
      },
      {
        name: "Newsletter",
        description: "A basic newsletter template",
        subject: "{{company}} Newsletter - {{month}}",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>{{company}} Newsletter</h2>
            <p>Hello {{name}},</p>
            <p>Here's what's new this month:</p>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0;">
              <h3>Feature Highlight</h3>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0;">
              <h3>Tips & Tricks</h3>
              <p>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
            </div>
            <p>Thank you for being a valued customer!</p>
            <p>Best regards,<br>The {{company}} Team</p>
          </div>
        `,
        category: "newsletter",
        isSystem: true,
        variables: [
          {
            name: "name",
            defaultValue: "there",
            description: "Recipient's name",
          },
          {
            name: "company",
            defaultValue: "Our Company",
            description: "Company name",
          },
          { name: "month", defaultValue: "June", description: "Current month" },
        ],
      },
      {
        name: "Follow-up",
        description: "A template for following up with leads",
        subject: "Following up on our conversation",
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <p>Hello {{name}},</p>
            <p>I wanted to follow up on our recent conversation about {{topic}}.</p>
            <p>I'd be happy to answer any additional questions you might have or provide more information.</p>
            <p>Would you be available for a quick call this week to discuss further?</p>
            <p>Best regards,<br>{{senderName}}<br>{{company}}</p>
          </div>
        `,
        category: "follow-up",
        isSystem: true,
        variables: [
          {
            name: "name",
            defaultValue: "there",
            description: "Recipient's name",
          },
          {
            name: "topic",
            defaultValue: "our services",
            description: "Conversation topic",
          },
          {
            name: "senderName",
            defaultValue: "John Doe",
            description: "Sender's name",
          },
          {
            name: "company",
            defaultValue: "Our Company",
            description: "Company name",
          },
        ],
      },
    ];

    await Template.insertMany(templates);

    console.log("Data Imported!".green);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete all data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Template.deleteMany();

    console.log("Data Destroyed!".red);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Command line args
if (process.argv[2] === "-i") {
  importData();
} else if (process.argv[2] === "-d") {
  deleteData();
} else {
  console.log("Please add proper command: -i (import) or -d (delete)");
  process.exit();
}
