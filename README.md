# PharmNow 💊

**Your Trusted Digital Pharmacy Platform**

PharmNow is a comprehensive digital pharmacy platform that connects users with verified pharmacies, enabling seamless medication ordering, prescription management, and healthcare services. Built with modern technologies to ensure security, scalability, and excellent user experience.

## 🌟 Features

### For Users 👥

- **📱 Easy Registration & Verification** - Secure email verification with 4-digit codes
- **🔐 Secure Authentication** - JWT-based authentication with password reset
- **🏥 Pharmacy Discovery** - Find verified pharmacies near you
- **💊 Product Browsing** - Browse medications and healthcare products
- **🛒 Order Management** - Place and track medication orders
- **⭐ Reviews & Ratings** - Rate your pharmacy experience
- **❤️ Favorites** - Save favorite pharmacies and products
- **📋 Order History** - Complete order tracking and history
- **🔔 Notifications** - Real-time updates on orders and promotions

### For Pharmacies 🏪

- **🏗️ Pharmacy Registration** - Complete onboarding with license verification
- **📸 Document Upload** - Cloudinary-powered file management
- **📦 Product Management** - Add, edit, and manage inventory
- **📊 Order Processing** - Efficient order fulfillment workflow
- **📈 Analytics Dashboard** - Business insights and performance metrics
- **💬 Customer Communication** - Direct messaging with customers
- **🚫 User Management** - Block/unblock users as needed
- **💰 Revenue Tracking** - Financial reporting and analytics

## 🛠️ Technology Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe development
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Cloudinary** - Image and document storage
- **Nodemailer** - Email services
- **Multer** - File upload handling

### Frontend (React Native)

- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type safety
- **React Query** - Data fetching and caching
- **AsyncStorage** - Local data persistence
- **Context API** - State management

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Postman** - API testing
- **MongoDB Compass** - Database management

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account
- SMTP email service

### Backend Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/TEE2DWHY/api-pharmnow
   cd pharmnow-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your configurations:

   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/pharmnow

   # JWT
   JWT_SECRET=your_super_secret_jwt_key
   SALT_ROUNDS=12

   # Email
   GMAIL_USERNAME=your_email@gmail.com
   GMAIL_PASSWORD=your_app_password

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # Server
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

### Frontend Setup (React Native)

1. **Clone the frontend repository**

   ```bash
   git clone https://github.com/yourusername/pharmnow-mobile.git
   cd pharmnow-mobile
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   # Create .env file
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

4. **Start the development server**

   ```bash
   # Start Expo
   npm start

   # Run on iOS simulator
   npm run ios

   # Run on Android emulator
   npm run android
   ```

## 📚 API Documentation

### Authentication Endpoints

#### User Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-email
POST /api/auth/resend-verification
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/change-password
GET  /api/auth/profile
POST /api/auth/refresh-token
```

#### Pharmacy Authentication

```http
POST /api/pharmacy-auth/register
POST /api/pharmacy-auth/login
POST /api/pharmacy-auth/verify-email
POST /api/pharmacy-auth/resend-verification
POST /api/pharmacy-auth/forgot-password
POST /api/pharmacy-auth/reset-password
POST /api/pharmacy-auth/change-password
GET  /api/pharmacy-auth/profile
POST /api/pharmacy-auth/refresh-token
```

### Business Logic Endpoints

```http
# Pharmacies
GET    /api/pharmacies
GET    /api/pharmacies/:id
GET    /api/pharmacies/:id/products
POST   /api/pharmacies/search

# Products
GET    /api/products
GET    /api/products/:id
POST   /api/products (pharmacy only)
PUT    /api/products/:id (pharmacy only)
DELETE /api/products/:id (pharmacy only)

# Orders
GET    /api/orders
POST   /api/orders
GET    /api/orders/:id
PUT    /api/orders/:id/status (pharmacy only)
POST   /api/orders/:id/review (user only)
```

### Request Examples

#### User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "John Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "phonenumber": "1234567890",
    "deliveryAddress": "123 Main St, City"
  }'
```

#### Pharmacy Registration

```bash
curl -X POST http://localhost:3000/api/pharmacy-auth/register \
  -F "name=City Pharmacy" \
  -F "email=pharmacy@example.com" \
  -F "password=securePassword123" \
  -F "location=Downtown City" \
  -F "contactNumber=9876543210" \
  -F "phonenumber=9876543210" \
  -F "pcnNumber=PCN123456" \
  -F "logo=@/path/to/logo.jpg" \
  -F "licenseDocument=@/path/to/license.pdf"
```

## 🏗️ Project Structure

```
pharmnow-backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── pharmacyAuth.controller.ts
│   │   ├── pharmacy.controller.ts
│   │   ├── product.controller.ts
│   │   └── order.controller.ts
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Pharmacy.model.ts
│   │   ├── Product.model.ts
│   │   └── Order.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── pharmacyAuth.routes.ts
│   │   ├── pharmacy.routes.ts
│   │   └── order.routes.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── upload.middleware.ts
│   │   └── validation.middleware.ts
│   ├── services/
│   │   └── email/
│   │       └── templates/
│   │           ├── verifyEmailTemplate.ts
│   │           └── resetPasswordTemplate.ts
│   ├── utils/
│   │   ├── createResponse.util.ts
│   │   ├── email.util.ts
│   │   └── createNotification.util.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   └── cloudinary.config.ts
│   └── app.ts
├── uploads/temp/
├── .env.example
├── package.json
└── README.md
```

## 🗄️ Database Schema

### User Model

```typescript
interface IUser {
  fullname: string;
  email: string;
  password: string;
  phonenumber: string;
  deliveryAddress: string;
  isVerified: boolean;
  favouritePharmacies: ObjectId[];
  favouriteProducts: ObjectId[];
  orders: ObjectId[];
  verificationCode?: string;
  verificationCodeExpires?: number;
  resetPasswordCode?: string;
  resetPasswordExpires?: number;
}
```

### Pharmacy Model

```typescript
interface IPharmacy {
  name: string;
  location: string;
  contactNumber: string;
  email: string;
  password: string;
  phonenumber: string;
  pcnNumber: string;
  licenseDocument: string;
  logo: string;
  referralCode?: string;
  isVerified: boolean;
  products: ObjectId[];
  blockedUsers: ObjectId[];
}
```

### Order Model

```typescript
interface IOrder {
  userId: ObjectId;
  pharmacyId: ObjectId;
  products: IOrderProduct[];
  totalPrice: number;
  status:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready_for_pickup"
    | "delivered";
  orderCode: string;
  deliveryAddress: string;
  deliveryType: "pickup" | "delivery";
  paymentMethod: "credit_card" | "transfer" | "cash_on_delivery";
  paymentStatus: "pending" | "paid" | "failed";
  review?: IOrderReview;
}
```

## 🔒 Security Features

- **🛡️ Password Hashing** - bcrypt with configurable salt rounds
- **🔐 JWT Authentication** - Secure token-based authentication
- **📧 Email Verification** - 4-digit codes with expiration
- **🔄 Password Reset** - Secure password reset with tokens
- **📁 File Upload Security** - File type validation and size limits
- **🚫 Rate Limiting** - Protection against spam and abuse
- **🔍 Input Validation** - Comprehensive request validation
- **🏥 Role-based Access** - User and Pharmacy permission systems

## 📧 Email Templates

PharmNow includes beautiful, responsive email templates:

- **✅ Verification Email** - Welcome users with verification codes
- **🔑 Password Reset** - Secure password reset instructions
- **📬 Order Notifications** - Order status updates
- **🎉 Welcome Messages** - Onboarding communications

All templates feature:

- 📱 Mobile-responsive design
- 🎨 Modern, clean UI
- 🏥 Pharmacy-themed branding
- ♿ Accessibility compliance

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

### API Testing with Postman

Import the Postman collection:

```bash
# Collection available at
./docs/PharmNow.postman_collection.json
```

## 🚀 Deployment

### Backend Deployment (Railway/Heroku)

1. **Environment Variables**

   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=production_jwt_secret
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

### Frontend Deployment (Expo)

1. **Build for Production**

   ```bash
   expo build:android
   expo build:ios
   ```

2. **Publish to App Stores**
   ```bash
   expo submit:android
   expo submit:ios
   ```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier configurations
- Write meaningful commit messages
- Add tests for new features

## 📝 License

This project is licensed under the [CWT License](https://codewithty.dev).

## 👥 Team

- **Backend Developer** - API development and database design
- **Frontend Developer** - Mobile app development
- **UI/UX Designer** - User interface and experience design
- **DevOps Engineer** - Deployment and infrastructure

## 📞 Support

- **Email**: hello@codewithty.dev
- **Email**: isaacolorunfemi330@gmail.com

## 🎯 Roadmap

### Version 2.0

- [ ] 💬 Real-time chat system
- [ ] 📍 GPS-based pharmacy finder
- [ ] 💳 Multiple payment methods
- [ ] 🔔 Push notifications
- [ ] 📊 Advanced analytics dashboard

### Version 3.0

- [ ] 🤖 AI-powered medication recommendations
- [ ] 👩‍⚕️ Telemedicine integration
- [ ] 📱 Progressive Web App (PWA)
- [ ] 🌍 Multi-language support
- [ ] 🔗 Third-party pharmacy integrations

---

<div align="center">

**Built with ❤️ for better healthcare access**

</div>
