import puppeteer, { Browser, Page } from 'puppeteer';
import { NetworkRequest, BlockedUrl } from '../types';

export interface NetworkDevice {
    id: string;
    name: string;
    ip: string;
    mac: string;
    blocked: boolean;
    type: '2G' | '5G' | '';
    deleteId: string | null;
}

const hardcodeDevices: Record<string, string> = {
    '12:9a:97:28:7f:86': 'Ryns Macbook Pro',
    'ea:44:01:16:44:aa': 'Ryns Redmi Note 7'
}

const storedDevices: Record<string, NetworkDevice> = {};

export class PuppeteerService {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private blockedUrls: Set<string> = new Set();
    private networkRequests: NetworkRequest[] = [];
    private blockedDevices: Set<string> = new Set();

    async initialize(): Promise<void> {
        this.browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
        });
        this.page = await this.browser.newPage();

        this.page.on('dialog', async (dialog) => {
            console.log('Dialog:', dialog.message());
            await dialog.accept();
        });

        // Set up request interception
        await this.page.setRequestInterception(true);

        this.page.on('request', (request) => {
            const url = request.url();
            const isBlocked = this.blockedUrls.has(url);

            // Record the request
            this.networkRequests.push({
                url,
                method: request.method(),
                resourceType: request.resourceType(),
                timestamp: Date.now(),
                blocked: isBlocked,
            });

            if (isBlocked) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }

    async loginToRouter(): Promise<void> {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.goto('http://192.168.1.1');
        await this.page.type('input[name="Username"]', 'user');
        await this.page.type('input[name="Password"]', 'user');
        await this.page.click('input[type="submit"]');
    }

    async checkLogin(): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');
        // await this.page.goto('http://192.168.1.1/start.ghtml', { waitUntil: 'load'});
        await this.page.reload();
        const menu0 = await this.page.$('#menu0');
        return menu0 !== null;
    }

    async scanNetwork(): Promise<NetworkDevice[]> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.goto('http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_dhcp_dynamic_t.gch');
            const content = await this.page.content();
            const devices = await this.page.evaluate(() => {
                const table = document.getElementById('Dhcp_Table');
                if (!table) return [];
                const rows = table.getElementsByTagName('tr');
                const devices = [];

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].getElementsByTagName('td');
                    const device = {
                        macAddress: cols[0].innerText,
                        ipAddress: cols[1].innerText,
                        hostName: cols[3].getElementsByTagName('input')[0].value,
                        port: cols[4].innerText
                    };
                    devices.push(device);
                }

                return devices;
            });
            const mockDevices: NetworkDevice[] = [];
            for (const device of devices) {
                mockDevices.push({
                    id: device.macAddress,
                    name: device.hostName || hardcodeDevices[device.macAddress] || 'Unknown',
                    ip: device.ipAddress,
                    mac: device.macAddress,
                    blocked: this.blockedDevices.has(device.macAddress),
                    type: '',
                    deleteId: null
                });
            }

            const connectedDevices5G = await this.getConnectedDevices5G();
            const connectedDevices2G = await this.getConnectedDevices2G();

            const resultDevices: NetworkDevice[] = [];

            for (const device of mockDevices) {
                if (!storedDevices[device.mac]) {
                    storedDevices[device.mac] = device;
                }
                if (connectedDevices5G.includes(device.ip)) {
                    resultDevices.push({
                        ...device,
                        type: '5G'
                    });
                } else if (connectedDevices2G.includes(device.ip)) {
                    resultDevices.push({
                        ...device,
                        type: '2G'
                    });
                }
            }

            // for (const resultDevice of resultDevices) {
            //     if (!storedDevices[resultDevice.mac]) {
            //         storedDevices[resultDevice.mac] = resultDevice;
            //     }
            // }
            return resultDevices;
        } catch (error) {
            console.error('Error navigating to DHCP server:', error);
            return [];
        }
    }

    async getConnectedDevices2G(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.goto('http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_assoc1_t.gch');
            const devices = await this.page.evaluate(() => {
                const table = document.getElementById('Assoc_Table');
                if (!table) return [];
                if (table.textContent && table.textContent.includes('There is no data.')) {
                    return [];
                }
                const rows = table.getElementsByTagName('tr');
                const devices = [];

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].getElementsByTagName('td');
                    const device = {
                        macAddress: cols[0].innerText,
                        ipAddress: cols[1].innerText
                    };
                    devices.push(device);
                }

                return devices;
            });
            return devices.map(device => device.ipAddress);
        } catch (error) {
            console.error('Error scanning network:', error);
            return [];
        }
    }

    async getConnectedDevices5G(): Promise<string[]> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.goto('http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_assoc2_t.gch');
            const devices = await this.page.evaluate(() => {
                const table = document.getElementById('Assoc_Table');
                if (!table) return [];
                if (table.textContent && table.textContent.includes('There is no data.')) {
                    return [];
                }

                const rows = table.getElementsByTagName('tr');
                const devices = [];

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].getElementsByTagName('td');
                    const device = {
                        macAddress: cols[0].innerText,
                        ipAddress: cols[1].innerText
                    };
                    devices.push(device);
                }

                return devices;
            });
            return devices.map(device => device.ipAddress);
        } catch (error) {
            console.error('Error scanning network:', error);
            return [];
        }
    }

    async blockedDeviceElement(url: string): Promise<any> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        await this.page.goto(url);
        const device = await this.page.evaluate((url) => {
            const table = document.getElementById('MAC_Table');

            if (!table) {
                return [];
            }

            const rows = table.getElementsByTagName('tr');
            const devices = [];

            for (let i = 2; i < rows.length; i++) {
                const cols = rows[i].getElementsByTagName('td');
                const device = {
                    ssid: cols[0].getElementsByTagName('input')[0].value,
                    macAddress: cols[1].getElementsByTagName('input')[0].value,
                    type: url.endsWith('net_wlanm_macfilter1_t.gch') ? '2G' : '5G',
                    deleteId: cols[2].getElementsByTagName('input')[0].getAttribute('id')
                };
                devices.push(device);
            }

            return devices;
        }, url)
        return device;
    }

    async getBlockedDevices(): Promise<NetworkDevice[]> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        const urls = [
            'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter1_t.gch',
            'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter2_t.gch'
        ];

        try {
            const devices = [];

            for (const url of urls) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const device = await this.blockedDeviceElement(url);
                devices.push(...device);
            }

            const blockedDevices: NetworkDevice[] = [];
            for (const device of devices) {
                storedDevices[device.macAddress].type = device.type as '2G' | '5G';
                storedDevices[device.macAddress].deleteId = device.deleteId;
                blockedDevices.push(storedDevices[device.macAddress]);
            }

            return blockedDevices;
        } catch (error) {
            console.error('Error fetching blocked devices:', error);
            return [];
        }
    }

    async blockDevice(type: '2G' | '5G', macAddress: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        console.log('Blocking device:', type, macAddress);

        let url = '';
        if (type === '2G') {
            url = 'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter1_t.gch';
        } else if (type === '5G') {
            url = 'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter2_t.gch';
        }

        const macSplit = macAddress.split(':');

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.goto(url);
            await this.page.type('input[name="mac1"]', macSplit[0]);
            await this.page.type('input[name="mac2"]', macSplit[1]);
            await this.page.type('input[name="mac3"]', macSplit[2]);
            await this.page.type('input[name="mac4"]', macSplit[3]);
            await this.page.type('input[name="mac5"]', macSplit[4]);
            await this.page.type('input[name="mac6"]', macSplit[5]);
            await this.page.click('input[type="submit"]');
            const device = await this.blockedDeviceElement(url);
            if (device.length > 0) {
                if (device.find((d: any) => d.macAddress === macAddress)) {
                    return true;
                } else {
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Error blocking device:', error);
            return false;
        }
    }

    async unblockDevice(type: '2G' | '5G', macAddress: string): Promise<boolean> {
        if (!this.page) throw new Error('Browser not initialized');

        if (!await this.checkLogin()) {
            await this.loginToRouter();
        }

        console.log('Unblocking device:', type, macAddress);

        let url = '';
        if (type === '2G') {
            url = 'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter1_t.gch';
        } else if (type === '5G') {
            url = 'http://192.168.1.1/getpage.gch?pid=1002&nextpage=net_wlanm_macfilter2_t.gch';
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.page.goto(url);
            await this.page.click(`#${storedDevices[macAddress].deleteId}`);
            const device = await this.blockedDeviceElement(url);
            const isInDevice = device.some((d: any) => d.macAddress === macAddress);
            if (!isInDevice) {
                storedDevices[macAddress].deleteId = null;
            }
            return !isInDevice;
        } catch (error) {
            console.error('Error unblocking device:', error);
            return false;
        }
    }

    async navigateTo(url: string): Promise<void> {
        if (!this.page) throw new Error('Browser not initialized');
        await this.page.goto(url);
    }

    blockUrl(url: string): void {
        this.blockedUrls.add(url);
    }

    unblockUrl(url: string): void {
        this.blockedUrls.delete(url);
    }

    getBlockedUrls(): string[] {
        return Array.from(this.blockedUrls);
    }

    getNetworkRequests(): NetworkRequest[] {
        return this.networkRequests;
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
} 