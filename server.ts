import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { handleRouteCalculation } from './src/server/handlers/routeHandler.ts';
import { handleGetHazards, handleResetHazards, handleSeedHazards } from './src/server/handlers/hazardsHandler.ts';
import { handleGetReports, handleCreateReport } from './src/server/handlers/reportHandler.ts';
import { handleGenerateBriefing } from './src/server/handlers/briefingHandler.ts';
import { handleGetStatus } from './src/server/handlers/statusHandler.ts';
import { getWeatherAdapter } from './src/server/adapters/weatherAdapter.ts';
import { CityId } from './src/types/index.ts';
import { INITIAL_HAZARDS } from './src/data/seedHazards.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ---------------- API ROUTES (Delegating to Lambda-Ready Handlers) ----------------

// GET /api/hazards
app.get('/api/hazards', async (req, res) => {
  const city = (req.query.city as string) || (req.query.cityId as string) || '';
  const result = await handleGetHazards(city);
  return res.status(result.statusCode).json(result.data);
});

// GET /api/reports
app.get('/api/reports', async (req, res) => {
  const city = (req.query.city as string) || (req.query.cityId as string) || '';
  const result = await handleGetReports(city);
  return res.status(result.statusCode).json(result.data);
});

// POST /api/route
app.post('/api/route', async (req, res) => {
  const result = await handleRouteCalculation(req.body);
  return res.status(result.statusCode).json(result.data);
});

// GET /api/weather
app.get('/api/weather', async (req, res) => {
  const city = ((req.query.city as string) || 'bengaluru').toLowerCase() as CityId;
  const latStr = req.query.lat as string | undefined;
  const lonStr = (req.query.lon || req.query.lng) as string | undefined;
  const locationName = req.query.locationName as string | undefined;

  let coords: [number, number] | undefined = undefined;
  if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords = [lat, lon];
    }
  }

  const weatherAdapter = getWeatherAdapter();
  const weather = await weatherAdapter.getWeather(city, coords, locationName);
  return res.json(weather);
});

// GET /api/weather/precipitation-grid
app.get('/api/weather/precipitation-grid', async (req, res) => {
  const city = ((req.query.city as string) || 'bengaluru').toLowerCase() as CityId;
  const latStr = req.query.lat as string | undefined;
  const lonStr = (req.query.lon || req.query.lng) as string | undefined;

  let coords: [number, number] | undefined = undefined;
  if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lon)) {
      coords = [lat, lon];
    }
  }

  const weatherAdapter = getWeatherAdapter();
  const grid = await weatherAdapter.getPrecipitationGrid(city, coords);
  return res.json(grid);
});

// POST /api/report & POST /api/reports/verify
const reportController = async (req: express.Request, res: express.Response) => {
  const result = await handleCreateReport(req.body);
  return res.status(result.statusCode).json(result.data);
};
app.post('/api/report', reportController);
app.post('/api/reports/verify', reportController);

// POST /api/ai-briefing
app.post('/api/ai-briefing', async (req, res) => {
  const result = await handleGenerateBriefing(req.body);
  return res.status(result.statusCode).json(result.data);
});

// GET /api/status & GET /api/aws-status (Demonstrable AWS Serverless Status)
const statusController = async (_req: express.Request, res: express.Response) => {
  const result = await handleGetStatus();
  return res.status(result.statusCode).json(result.data);
};
app.get('/api/status', statusController);
app.get('/api/aws-status', statusController);

// POST /api/reset-hazards
app.post('/api/reset-hazards', async (req, res) => {
  const result = await handleResetHazards();
  return res.status(result.statusCode).json(result.data);
});

// POST /api/hazards/seed
app.post('/api/hazards/seed', async (req, res) => {
  const city = (req.query.city as string) || (req.body?.city as string) || '';
  const result = await handleSeedHazards(city);
  return res.status(result.statusCode).json(result.data);
});

// Start Express server & mount Vite in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ClimatePulse AI] Server active on http://0.0.0.0:${PORT}`);
    const missingCityCount = INITIAL_HAZARDS.filter((h) => !h.city).length;
    const missingStatusCount = INITIAL_HAZARDS.filter((h) => !h.status).length;
    console.log(
      `[STARTUP CHECK] Seeded hazards: ${INITIAL_HAZARDS.length} total. Missing city: ${missingCityCount}, Missing status: ${missingStatusCount}.`
    );
  });
}

startServer();
