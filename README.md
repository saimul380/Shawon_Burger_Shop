# Shawon Burger Shop

A modern burger shop website with a complete ordering system and admin panel.

## Features

- User Authentication
- Online Ordering System
- Menu Management
- Combo Deals
- Customer Reviews
- Admin Dashboard with Analytics
- Order Management
- PDF Export and Printing

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap 5, Chart.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Payment: Stripe Integration

## Deployment Instructions

1. Create a MongoDB Atlas account and database
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (free tier available)
   - Get your connection string

2. Create a Stripe account
   - Go to [Stripe](https://stripe.com)
   - Get your API keys

3. Deploy to Render.com
   - Sign up at [Render](https://render.com)
   - Create a new Web Service
   - Connect your GitHub repository
   - Add environment variables:
     ```
     MONGODB_URI=your_mongodb_uri
     JWT_SECRET=your_secure_jwt_secret
     STRIPE_SECRET_KEY=your_stripe_secret_key
     PORT=3000
     ```
# Shawon's Burger Shop - Full Stack Web Application

A modern, responsive burger shop website with online ordering system, admin dashboard, and real-time order management.

## Features

- 🍔 **Menu Browsing**: View delicious burgers and combo meals
- 🛒 **Online Ordering**: Place orders with customizations
- 📱 **Responsive Design**: Works on all devices
- 👨‍🍳 **Admin Dashboard**: Manage orders, menu, and view analytics
- 💳 **Multiple Payment Methods**: Cash on delivery and online payments
- 📊 **Real-time Updates**: Order status updates in real-time

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla), Chart.js
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Stripe Integration
- **Deployment**: GitHub, Vercel (Frontend), Railway (Backend)

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- PostgreSQL (v12 or higher)
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/saimul380/Shawon_Burger_Shop.git
cd Shawon-Burger-Shop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add the following:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/shawon_burger_shop

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=30d

# Email (for order confirmations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# Stripe (for online payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Set Up Database

1. Create a new PostgreSQL database:
   ```sql
   CREATE DATABASE shawon_burger_shop;
   ```

2. Run the database schema:
   ```bash
   psql -U your_username -d shawon_burger_shop -f db/schema.sql
   ```

3. (Optional) Seed initial data:
   ```bash
   node db/seed.js
   ```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Admin Access

Default admin credentials (change these in production):
- **Email**: admin@shawonburger.com
- **Password**: admin123

Access the admin panel at: `http://localhost:3000/admin`

## Deployment

### Frontend (Vercel)
1. Push your code to GitHub
2. Import the repository in Vercel
3. Set the build command: `npm run build`
4. Set the output directory: `public`
5. Add environment variables

### Backend (Railway)
1. Create a new project in Railway
2. Connect your GitHub repository
3. Add a PostgreSQL database
4. Set up environment variables
5. Deploy

## API Documentation

API documentation is available at `/api-docs` when running in development mode.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

- **Email**: support@shawonburger.com
- **GitHub**: [@saimul380](https://github.com/saimul380)
- **Project Link**: [https://github.com/saimul380/Shawon_Burger_Shop](https://github.com/saimul380/Shawon_Burger_Shop)
