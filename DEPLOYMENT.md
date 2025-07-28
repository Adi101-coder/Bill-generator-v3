# Deployment Guide: Render (Server) + Vercel (Frontend)

## Overview
This guide explains how to deploy your Bill Generator app with:
- **Backend Server**: Deployed on Render
- **Frontend**: Deployed on Vercel

## Step 1: Deploy Server on Render

### 1.1 Prepare for Render Deployment
1. Make sure your `server/package.json` has the correct start script
2. Ensure `render.yaml` is in your root directory
3. Your server code is ready (already configured)

### 1.2 Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `bill-generator-api`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

### 1.3 Set Environment Variables on Render
In your Render service settings, add these environment variables:
- `NODE_ENV`: `production`
- `MONGODB_URI`: `mongodb+srv://aditkatiyar101:katiyar1972@cluster0.bhjbsnd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
- `PORT`: `10000`

### 1.4 Get Your Render URL
After deployment, note your Render URL (e.g., `https://bill-generator-api.onrender.com`)

## Step 2: Update Frontend Configuration

### 2.1 Update API URL
Replace `your-render-app-name` in `vercel.json` with your actual Render app name:
```json
"REACT_APP_API_URL": "https://your-actual-render-app-name.onrender.com/api"
```

### 2.2 Update CORS in Server
In `server/index.js`, update the CORS origin with your actual Vercel domain:
```javascript
origin: process.env.NODE_ENV === 'production' 
  ? ['https://your-actual-vercel-domain.vercel.app', 'http://localhost:3000'] 
  : 'http://localhost:3000'
```

## Step 3: Deploy Frontend on Vercel

### 3.1 Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3.2 Set Environment Variables on Vercel
In your Vercel project settings, add:
- `REACT_APP_API_URL`: `https://your-render-app-name.onrender.com/api`
- `NODE_ENV`: `production`

## Step 4: Test Your Deployment

### 4.1 Test Server Endpoints
- Health check: `https://your-render-app-name.onrender.com/api/health`
- Bills endpoint: `https://your-render-app-name.onrender.com/api/bills`

### 4.2 Test Frontend
- Visit your Vercel URL
- Test the application functionality

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Make sure your Vercel domain is added to the CORS origins in your server
   - Check that the API URL is correct in your frontend

2. **Environment Variables**
   - Ensure all environment variables are set in both Render and Vercel
   - Check that the MongoDB URI is correct

3. **Build Failures**
   - Check the build logs in both Render and Vercel
   - Ensure all dependencies are properly installed

4. **API Connection Issues**
   - Test your Render API endpoints directly
   - Check that your frontend is using the correct API URL

### Useful Commands:

```bash
# Test your Render API locally
curl https://your-render-app-name.onrender.com/api/health

# Check your Vercel deployment
vercel --prod

# View Render logs
# Go to Render dashboard → Your service → Logs
```

## Benefits of This Setup

1. **Better Server Performance**: Render provides dedicated servers instead of serverless functions
2. **Cost Effective**: Free tier on both platforms
3. **Scalability**: Easy to scale both frontend and backend independently
4. **Reliability**: Render is more reliable for long-running processes than Vercel serverless

## Next Steps

1. Deploy your server on Render first
2. Update the configuration files with your actual URLs
3. Deploy your frontend on Vercel
4. Test the complete application
5. Set up custom domains if needed 