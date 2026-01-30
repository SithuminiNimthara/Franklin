import { Camera } from './camera.model.js';
import { streamingService } from '../streaming/streaming.service.js';

const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

const generateRtspUrl = (ip) => {
    return `rtsp://admin:EDSNNP@${ip.trim()}:554/Streaming/Channels/101`;
};

export const cameraController = {
    getCameras: async (req, res) => {
        try {
            const { userId } = req.auth;
            const cameras = await Camera.find({ clerkUserId: userId }).sort({ isMain: -1, name: 1 });
            res.json({ success: true, data: cameras });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    addCamera: async (req, res) => {
        try {
            const { userId } = req.auth;
            const { name, ipAddress } = req.body;

            if (!name || !ipAddress) {
                return res.status(400).json({ success: false, message: 'Name and IP Address are required' });
            }

            const trimmedIp = ipAddress.trim();
            if (!IP_REGEX.test(trimmedIp)) {
                return res.status(400).json({ success: false, message: 'Invalid IPv4 address format' });
            }

            const isMain = name.trim().toLowerCase() === 'main camera';

            // If this is set as main, unset other main cameras for this user
            if (isMain) {
                await Camera.updateMany({ clerkUserId: userId }, { isMain: false });
            }

            const rtspUrl = generateRtspUrl(trimmedIp);

            const camera = new Camera({
                clerkUserId: userId,
                name: name.trim(),
                ipAddress: trimmedIp,
                isMain,
                rtspUrl,
                isEnabled: true
            });

            await camera.save();

            // Start streaming immediately
            streamingService.startCamera({ id: camera._id.toString(), rtspUrl: camera.rtspUrl });

            res.json({ success: true, data: camera });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    updateCamera: async (req, res) => {
        try {
            const { userId } = req.auth;
            const { id } = req.params;
            const { name, ipAddress, isEnabled } = req.body;

            const existingCamera = await Camera.findOne({ _id: id, clerkUserId: userId });
            if (!existingCamera) {
                return res.status(404).json({ success: false, message: 'Camera not found' });
            }

            const updateData = {};
            if (name !== undefined) {
                updateData.name = name.trim();
                const wasMain = existingCamera.isMain;
                const nowMain = updateData.name.toLowerCase() === 'main camera';

                if (nowMain && !wasMain) {
                    await Camera.updateMany({ clerkUserId: userId }, { isMain: false });
                    updateData.isMain = true;
                } else if (!nowMain && wasMain) {
                    updateData.isMain = false;
                }
            }

            if (ipAddress !== undefined) {
                const trimmedIp = ipAddress.trim();
                if (!IP_REGEX.test(trimmedIp)) {
                    return res.status(400).json({ success: false, message: 'Invalid IPv4 address format' });
                }
                updateData.ipAddress = trimmedIp;
                updateData.rtspUrl = generateRtspUrl(trimmedIp);
            }

            if (isEnabled !== undefined) {
                updateData.isEnabled = isEnabled;
            }

            const camera = await Camera.findByIdAndUpdate(id, updateData, { new: true });

            // Manage streaming process
            streamingService.stopCamera(id);
            if (camera.isEnabled) {
                streamingService.startCamera({ id: camera._id.toString(), rtspUrl: camera.rtspUrl });
            }

            res.json({ success: true, data: camera });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteCamera: async (req, res) => {
        try {
            const { userId } = req.auth;
            const { id } = req.params;

            const camera = await Camera.findOneAndDelete({ _id: id, clerkUserId: userId });

            if (!camera) {
                return res.status(404).json({ success: false, message: 'Camera not found' });
            }

            // Stop and cleanup
            streamingService.stopCamera(id);

            res.json({ success: true, message: 'Camera deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};
