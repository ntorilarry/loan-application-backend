# Deployment Guide for Render

## Production Scripts Added

The following scripts have been added to `package.json` for production deployment:

- `npm run build` - Compiles TypeScript to JavaScript in the `dist/` folder
- `npm start` - Runs the compiled JavaScript application
- `npm run migrate:prod` - Runs database migrations in production
- `npm run seed:prod` - Seeds the database in production
- `npm run setup:prod` - Runs setup scripts in production

## Render Configuration

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm start
```

### Environment Variables
Set these in your Render dashboard:

#### Production Database
```
DATABASE_URL=postgresql://loan_drift_db_user:58KFM9F7rdrR9yXZuduSfZoew77nupyi@dpg-d3f44r1r0fns73d7okp0-a/loan_drift_db
NODE_ENV=production
```

#### Other Required Environment Variables
Add any other environment variables your application needs (JWT secrets, AWS credentials, etc.)

### Deployment Steps

1. **Connect your repository** to Render
2. **Set Build Command**: `npm install && npm run build`
3. **Set Start Command**: `npm start`
4. **Add Environment Variables** in the Render dashboard
5. **Deploy**

### Database Migration

After deployment, you may need to run migrations. You can do this by:

1. Using Render's shell access to run: `npm run migrate:prod`
2. Or set up a separate job service in Render for migrations

### Local vs Production

- **Local Development**: Use `npm run dev` (uses ts-node and nodemon)
- **Production**: Use `npm run build` then `npm start` (uses compiled JavaScript)

## Troubleshooting

- Make sure `NODE_ENV=production` is set in Render
- Ensure all required environment variables are set
- Check that the build completes successfully before the start command runs
- Verify that the `dist/` folder is created during the build process
