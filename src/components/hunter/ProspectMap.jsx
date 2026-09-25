import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { scoreColor, scoreRadius } from '@/lib/constants';
import 'leaflet/dist/leaflet.css';

export default function ProspectMap({ prospects, onOpenDetail }) {
  const withCoords = prospects.filter((p) => p.lat && p.lng);
  if (!withCoords.length) {
    return (
      <div className="rounded-sm border border-border bg-card p-8 text-center font-mono text-xs text-muted-foreground">
        No mapped prospects yet — run a hunt to plot results.
      </div>
    );
  }

  const center = [withCoords[0].lat, withCoords[0].lng];

  return (
    <div className="rounded-sm border border-border overflow-hidden h-[28rem]">
      <MapContainer center={center} zoom={11} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
        />
        {withCoords.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={scoreRadius(p.ai_score)}
            pathOptions={{ color: scoreColor(p.ai_score), fillColor: scoreColor(p.ai_score), fillOpacity: 0.7 }}
            eventHandlers={{ click: () => onOpenDetail(p) }}
          >
            <Popup>
              <div className="font-mono text-xs">
                <strong>{p.name}</strong><br />{p.facility_type}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
