# Database Migration Guide

This guide helps you implement the critical database improvements made to the Play11 Fantasy Cricket platform.

## 🚨 Critical Security Updates

### 1. Password Security
- **Fixed**: Plain text password comparison → bcrypt hashing
- **Action Required**: Update existing passwords if any exist in plain text

### 2. Database Schema Changes
- **Fixed**: Float → Decimal for monetary values
- **Added**: Comprehensive database indexes for performance
- **Added**: String length constraints and validation
- **Added**: Missing constraints and foreign keys

## 📋 Migration Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your actual values:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/play11"
   NEXTAUTH_SECRET="your-32-char-secret-key"
   SPORTMONK_API_KEY="your-api-key"
   ```

### Step 3: Database Migration
```bash
# Generate migration
npx prisma migrate dev --name "security_and_performance_updates"

# OR if you need to reset (⚠️ WARNING: This will delete all data)
npx prisma migrate reset
```

### Step 4: Validate Environment Variables
The application now validates environment variables on startup. Ensure all required variables are set.

## 🔧 Schema Changes Summary

### Security Improvements
- **Password Hashing**: All passwords now use bcrypt
- **Input Validation**: String length limits added to prevent injection attacks
- **Environment Validation**: Required environment variables are validated

### Performance Improvements
- **Indexes Added**: 25+ new indexes on foreign keys and frequently queried fields
- **Decimal Precision**: Monetary values use Decimal(10,2) for accuracy
- **Constraint Validation**: Unique constraints and foreign key relationships

### Data Integrity
- **String Lengths**: All string fields now have appropriate length limits
- **Unique Constraints**: Email, PAN, phone numbers are properly constrained
- **Foreign Keys**: All relationships have proper foreign key constraints

## 📊 Index Coverage

The following indexes have been added for optimal performance:

### User Table
- email (unique)
- panNumber (unique)
- phone (unique)
- role

### Match Table
- tournamentId
- sportMonkApiId (unique)
- status
- matchDate

### Contest Table
- matchId
- contestStatus
- createdBy
- contestType
- entryFee

### Transaction Table
- userId
- type
- status
- createdAt
- referenceId

### And many more across all tables...

## 🔍 Validation Rules

### User Registration
- Email: 255 chars max, unique
- Phone: 15 chars max, unique
- PAN: 10 chars max, unique
- Name: 100 chars max
- Password: 255 chars max (bcrypt hash)

### Monetary Values
- walletBalance: Decimal(10,2)
- entryFee: Decimal(10,2)
- prizePool: Decimal(10,2)
- All monetary calculations use precise decimal arithmetic

## 🚀 Next Steps

1. **Run Migration**: Execute the migration commands above
2. **Test**: Verify all functionality works as expected
3. **Update Existing Data**: If you have existing float values, consider converting them
4. **Deploy**: Deploy to production with confidence

## 🆘 Troubleshooting

### Common Issues
1. **Migration Fails**: Ensure PostgreSQL is running and credentials are correct
2. **Validation Errors**: Check all environment variables are set
3. **Performance Issues**: Verify indexes were created successfully

### Verification Commands
```bash
# Check database connection
npx prisma db pull

# Verify indexes
npx prisma db execute --file check-indexes.sql

# Check table structure
npx prisma studio
```

## 📞 Support

If you encounter any issues during migration, please:
1. Check the error logs
2. Verify your database connection
3. Ensure all environment variables are properly set
4. Run `npx prisma generate` to update the client

For additional help, create an issue with the error details and your environment configuration.