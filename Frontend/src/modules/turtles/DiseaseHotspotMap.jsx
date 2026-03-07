import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../../shared/config';

const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '400px',
    borderRadius: '1rem',
};

// Sri Lanka's turtle coast
const defaultCenter = { lat: 6.0535, lng: 80.2210 };

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    styles: [
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0f4f0' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
};

const CLASS_CONFIG = {
    fp: { label: 'Fibropapillomatosis (FP)', color: '#ef4444', bgColor: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', pillBg: 'bg-red-100 dark:bg-red-900/20' },
    barnacles: { label: 'Barnacles', color: '#f59e0b', bgColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', pillBg: 'bg-amber-100 dark:bg-amber-900/20' },
    healthy: { label: 'Healthy', color: '#22c55e', bgColor: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400', pillBg: 'bg-green-100 dark:bg-green-900/20' },
};

export default function DiseaseHotspotMap({ refreshTrigger }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    const [locations, setLocations] = useState([]);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [map, setMap] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch locations
    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE_URL}/api/health/locations`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setLocations(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch health locations', err);
                setLoading(false);
            });
    }, [refreshTrigger]);

    const onLoad = useCallback((map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback(() => {
        setMap(null);
    }, []);

    // Fit bounds to markers when data loads
    useEffect(() => {
        if (map && locations.length > 0 && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            locations.forEach(loc => bounds.extend({ lat: loc.lat, lng: loc.lng }));
            map.fitBounds(bounds, { padding: 50 });

            // Don't zoom in too much for a single point
            const listener = window.google.maps.event.addListener(map, 'idle', () => {
                if (map.getZoom() > 15) map.setZoom(15);
                window.google.maps.event.removeListener(listener);
            });
        }
    }, [map, locations]);

    // Count by class
    const counts = locations.reduce((acc, loc) => {
        acc[loc.class] = (acc[loc.class] || 0) + 1;
        return acc;
    }, {});

    if (!isLoaded) {
        return (
            <div className="w-full h-[400px] bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center text-gray-400">
                Loading Google Maps...
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                    {Object.entries(CLASS_CONFIG).map(([key, cfg]) => (
                        <div key={key} className="flex items-center space-x-1.5">
                            <span className={`inline-block w-3 h-3 rounded-full ${cfg.bgColor} shadow-sm`} />
                            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{key === 'fp' ? 'FP' : key}</span>
                            {counts[key] !== undefined && (
                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cfg.pillBg} ${cfg.textColor}`}>{counts[key]}</span>
                            )}
                        </div>
                    ))}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {locations.length} total diagnoses mapped
                </span>
            </div>

            {/* Map */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-800 shadow-sm">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center backdrop-blur-sm">
                        <p className="text-sm font-bold text-gray-500 animate-pulse">Loading map data...</p>
                    </div>
                )}

                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={defaultCenter}
                    zoom={10}
                    onLoad={onLoad}
                    onUnmount={onUnmount}
                    options={mapOptions}
                >
                    {locations.map((loc, idx) => {
                        const cfg = CLASS_CONFIG[loc.class] || CLASS_CONFIG.healthy;
                        return (
                            <Marker
                                key={idx}
                                position={{ lat: loc.lat, lng: loc.lng }}
                                onClick={() => setSelectedMarker(idx)}
                                icon={{
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 9,
                                    fillColor: cfg.color,
                                    fillOpacity: 0.9,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2.5,
                                }}
                            />
                        );
                    })}

                    {selectedMarker !== null && locations[selectedMarker] && (
                        <InfoWindow
                            position={{ lat: locations[selectedMarker].lat, lng: locations[selectedMarker].lng }}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div className="p-1 min-w-[180px]">
                                <div className="flex items-center space-x-2 mb-2">
                                    {locations[selectedMarker].class === 'healthy'
                                        ? <CheckCircle className="h-4 w-4" style={{ color: CLASS_CONFIG[locations[selectedMarker].class]?.color }} />
                                        : <AlertCircle className="h-4 w-4" style={{ color: CLASS_CONFIG[locations[selectedMarker].class]?.color }} />
                                    }
                                    <span className="font-bold text-sm text-gray-900 uppercase">
                                        {CLASS_CONFIG[locations[selectedMarker].class]?.label || locations[selectedMarker].class}
                                    </span>
                                </div>
                                <div className="space-y-1 text-xs text-gray-600">
                                    <p>
                                        <span className="font-semibold">Confidence:</span>{' '}
                                        <span className="font-bold text-gray-900">{(locations[selectedMarker].confidence * 100).toFixed(1)}%</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold">Date:</span>{' '}
                                        {new Date(locations[selectedMarker].timestamp).toLocaleString('en-LK')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-mono">
                                        {locations[selectedMarker].lat.toFixed(5)}, {locations[selectedMarker].lng.toFixed(5)}
                                    </p>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Empty state */}
                {!loading && locations.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 pointer-events-none">
                        <div className="text-center">
                            <MapPin className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No location data yet</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-600">Diagnose a turtle with GPS enabled to see data here</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
