# Deployment Guide

## Local Development

1. Install dependencies:
```bash
npm install
cd server && npm install
```

2. Start the development server:
```bash
npm run dev:full
```

This will start both the React frontend (port 3000) and the Express backend (port 5000).

## Production Deployment (Vercel)

### Prerequisites
- Vercel account
- MongoDB Atlas database
- Environment variables configured

### Environment Variables
Make sure these are set in your Vercel project:
- `MONGODB_URI`: Your MongoDB connection string
- `REACT_APP_API_URL`: Set to `/api` for production
- `NODE_ENV`: Set to `production`

### Deployment Steps

1. **Build the project:**
```bash
npm run build:full
```

2. **Deploy to Vercel:**
```bash
vercel --prod
```

### Troubleshooting API Issues

If you're getting 404 or 500 errors with the API:

1. **Check API connectivity:**
   - Visit `/api/health` in your browser
   - Check browser console for API test results

2. **Verify environment variables:**
   - Ensure `MONGODB_URI` is correctly set
   - Ensure `REACT_APP_API_URL` is set to `/api`

3. **Check Vercel logs:**
   - Go to your Vercel dashboard
   - Check the Function logs for any errors

4. **Test API endpoints:**
   - `/api/health` - Should return server status
   - `/api/bills/test` - Should return API test response
   - `/api/bills` - Should return bills list

### Common Issues

1. **404 Error on API calls:**
   - Check that `vercel.json` has correct rewrites
   - Ensure server is properly exported in `server/index.js`

2. **500 Error on API calls:**
   - Check MongoDB connection
   - Verify all required environment variables
   - Check server logs for detailed error messages

3. **CORS Issues:**
   - CORS is configured to allow all origins in production
   - Check browser console for CORS errors

### Debugging Steps

1. **Add console logs to track API calls:**
   - Check browser console for API_BASE_URL
   - Monitor network tab for failed requests

2. **Test API endpoints manually:**
   - Use browser to visit `/api/health`
   - Use Postman or curl to test POST requests

3. **Check database connection:**
   - Verify MongoDB Atlas is accessible
   - Check if database user has correct permissions

### Environment Configuration

For production, ensure these environment variables are set:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
REACT_APP_API_URL=/api
NODE_ENV=production
```

### API Endpoints

- `GET /api/health` - Server health check
- `GET /api/bills/test` - API test endpoint
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill 