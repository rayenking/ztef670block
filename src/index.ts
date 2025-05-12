import express, { Request, Response, Router, RequestHandler } from 'express';
import path from 'path';
import { PuppeteerService } from './services/puppeteer.service';

const app = express();
const router = Router();
const port = process.env.PORT || 3000;
const puppeteerService = new PuppeteerService();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Puppeteer
const initializeHandler: RequestHandler = async (req, res) => {
    try {
        // First close any existing browser instances
        await puppeteerService.close();
        // Then initialize a new instance
        await puppeteerService.initialize();
        res.json({ message: 'Puppeteer initialized successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to initialize Puppeteer' });
    }
};

// Scan Network
const scanNetworkHandler: RequestHandler = async (req, res) => {
    try {
        const devices = await puppeteerService.scanNetwork();
        res.json({ devices });
    } catch (error) {
        res.status(500).json({ error: 'Failed to scan network' });
    }
};

// Blocked Devices
const blockedDevicesHandler: RequestHandler = async (req, res) => {
    const blockedDevices = await puppeteerService.getBlockedDevices();
    res.json({ devices: blockedDevices });
};

// Block Device
const blockDeviceHandler: RequestHandler = async (req, res) => {
    const { type, macAddress } = req.body;
    if (!type || !macAddress) {
        res.status(400).json({ error: 'Type and MAC address are required' });
        return;
    }

    const result = await puppeteerService.blockDevice(type, macAddress);
    res.json({ message: 'Device blocked successfully', result });
};

// Unblock Device
const unblockDeviceHandler: RequestHandler = async (req, res) => {
    const { type, macAddress } = req.body;
    if (!type || !macAddress) {
        res.status(400).json({ error: 'Type and MAC address are required' });
        return;
    }

    const result = await puppeteerService.unblockDevice(type, macAddress);
    res.json({ message: 'Device unblocked successfully', result });
};

// Close browser
const closeHandler: RequestHandler = async (req, res) => {
    try {
        await puppeteerService.close();
        res.json({ message: 'Browser closed successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to close browser' });
    }
};

router.get('/api/initialize', initializeHandler);
router.get('/api/scan', scanNetworkHandler);
router.post('/api/block', blockDeviceHandler);
router.post('/api/unblock', unblockDeviceHandler);
router.post('/api/close', closeHandler);
router.get('/api/blocked', blockedDevicesHandler);

app.use(router);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 