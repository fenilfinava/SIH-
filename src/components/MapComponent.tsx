"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Dynamically import Leaflet components to avoid SSR errors
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

const DISTRICT_COORDS: Record<string, [number, number]> = {
  'rajkot': [22.3039, 70.8022],
  'surat': [21.1702, 72.8311],
  'ahmedabad': [23.0225, 72.5714],
  'vadodara': [22.3072, 73.1812],
  'bhavnagar': [21.7645, 72.1519],
  'jamnagar': [22.4707, 70.0577],
  'gandhinagar': [23.2156, 72.6369],
  'junagadh': [21.5222, 70.4579],
  'anand': [22.5645, 72.9289],
  'kutch': [23.7337, 69.8597],
  'bhuj': [23.2420, 69.6669],
  'amreli': [21.6032, 71.2221],
  'bharuch': [21.7051, 72.9959],
  'navsari': [20.9467, 72.9520],
  'vapi': [20.3893, 72.9106],
  'porbandar': [21.6417, 69.6293],
  'pune': [18.5204, 73.8567],
  'nagpur': [21.1458, 79.0882],
  'nashik': [20.0110, 73.7903],
  'aurangabad': [19.8762, 75.3433],
  'jaipur': [26.9124, 75.7873],
  'jodhpur': [26.2389, 73.0243],
  'udaipur': [24.5854, 73.7125],
  'kota': [25.2138, 75.8648],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'jabalpur': [23.1815, 79.9864],
  'gwalior': [26.2183, 78.1828],
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'agra': [27.1767, 78.0081],
  'varanasi': [25.3176, 82.9739],
  'bengaluru': [12.9716, 77.5946],
  'mysuru': [12.2958, 76.6394],
  'hubballi': [15.3647, 75.1240],
  'mangaluru': [12.9141, 74.8560],
  'chennai': [13.0827, 80.2707],
  'coimbatore': [11.0168, 76.9558],
  'madurai': [9.9252, 78.1198],
  'salem': [11.6643, 78.1460]
};

export default function MapComponent({ fullScreen = false }) {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number]>([22.3, 70.8]);
  const [zoom, setZoom] = useState(7);

  useEffect(() => {
    // Delete leaflet default icon to fix missing icon issue
    delete (window as any).L?.Icon?.Default?.prototype?._getIconUrl;
    if (typeof window !== 'undefined' && (window as any).L) {
      (window as any).L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }

    async function fetchData() {
      try {
        const res = await supabase.from('disease_reports').select('*');
        let filtered = res.filter((d: any) => d.lat && d.lng);
        if (user?.role === 'OFFICER' && user?.location) {
          filtered = filtered.filter((d: any) => d.location_name?.toLowerCase().includes(user.location.toLowerCase()));
        }
        
        if (user?.role === 'OFFICER') {
          setZoom(10);
          const locKey = user.location?.toLowerCase().trim();
          let matched = false;
          
          // 1. Try to center based on actual data points
          if (filtered.length > 0) {
            const sumLat = filtered.reduce((sum: number, p: any) => sum + Number(p.lat), 0);
            const sumLng = filtered.reduce((sum: number, p: any) => sum + Number(p.lng), 0);
            setCenter([sumLat / filtered.length, sumLng / filtered.length]);
            matched = true;
          } 
          
          // 2. If no data, try to center based on district dictionary
          if (!matched && locKey) {
            for (const [dist, coords] of Object.entries(DISTRICT_COORDS)) {
              if (locKey.includes(dist)) {
                setCenter(coords);
                matched = true;
                break;
              }
            }
          }
        }
        
        setData(filtered);
      } catch (e) {}
    }
    fetchData();
  }, [user]);

  if (typeof window === 'undefined') return null;

  return (
    <div className={`w-full overflow-hidden shadow-lg border border-gray-100 ${fullScreen ? 'h-[calc(100vh-64px)]' : 'h-[500px] rounded-3xl'}`}>
      <MapContainer 
        key={center.join(',')}
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={fullScreen}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data.map((point: any, index: number) => {
          const conf = point.confidence_score || 100;
          const markerColor = conf < 60 ? 'yellow' : conf <= 80 ? 'orange' : 'red';
          const fillColor = conf < 60 ? '#facc15' : conf <= 80 ? '#f97316' : '#ef4444';
          return (
            <CircleMarker 
              key={index} 
              center={[point.lat, point.lng]} 
              radius={15} 
              pathOptions={{ color: markerColor, fillColor: fillColor, fillOpacity: 0.6, weight: 2 }}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-lg">{point.ai_disease}</h3>
                  <p className="text-sm text-gray-600">Crop: {point.crop || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Farmer: {point.farmer_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-600">Location: {point.location_name}</p>
                  <p className="text-sm text-gray-600">Confidence: {point.confidence_score ? `${point.confidence_score}%` : 'N/A'}</p>
                  {point.created_at && <p className="text-sm text-gray-600">Date: {new Date(point.created_at).toLocaleDateString()}</p>}
                  <span className={`inline-block mt-2 px-2 py-1 text-xs font-bold rounded-full ${point.status === 'validated' ? 'bg-green-100 text-green-700' : point.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {point.status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
