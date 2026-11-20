/* eslint-disable camelcase */
import { generateUUID } from 'utils/uuid';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslate } from 'react-translate';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';
import qs from 'qs';
import L from 'leaflet';
import objectPath from 'object-path';
import sanitizeHtml from 'sanitize-html';
import { history } from 'store';
import MobileDetect from 'mobile-detect';
import { makeStyles } from '@mui/styles';
import { Snackbar } from '@mui/material';
import { Theme } from '@mui/material/styles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import Message from 'components/Snackbars/Message';
import CloseIcon from '@mui/icons-material/Close';
import MuiAlert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import { addMessage } from 'actions/error';
import evaluate from 'helpers/evaluate';
import waiter from 'helpers/waitForAction';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-fullscreen/styles.css';
import processList from 'services/processList';
import UkraineGeoJson from './UkraineGeoJson';

interface Coordinates {
  lat: number;
  lng: number;
  [key: string]: unknown;
}

const API_URL = ({ lat, lng }: Coordinates) =>
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uk`;

const AP_URL_RAW = (address: string) =>
  `https://nominatim.openstreetmap.org/search?format=json&q=${address}&accept-language=uk`;

const placeIcon = L.divIcon({
  className: 'custom-icon',
  html: '<svg fill="#000000" height="24px" width="24px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 297 297" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M148.5,0C87.43,0,37.747,49.703,37.747,110.797c0,91.026,99.729,179.905,103.976,183.645 c1.936,1.705,4.356,2.559,6.777,2.559c2.421,0,4.841-0.853,6.778-2.559c4.245-3.739,103.975-92.618,103.975-183.645 C259.253,49.703,209.57,0,148.5,0z M148.5,272.689c-22.049-21.366-90.243-93.029-90.243-161.892 c0-49.784,40.483-90.287,90.243-90.287s90.243,40.503,90.243,90.287C238.743,179.659,170.549,251.322,148.5,272.689z"></path> <path d="M148.5,59.183c-28.273,0-51.274,23.154-51.274,51.614c0,28.461,23.001,51.614,51.274,51.614 c28.273,0,51.274-23.153,51.274-51.614C199.774,82.337,176.773,59.183,148.5,59.183z M148.5,141.901 c-16.964,0-30.765-13.953-30.765-31.104c0-17.15,13.801-31.104,30.765-31.104c16.964,0,30.765,13.953,30.765,31.104 C179.265,127.948,165.464,141.901,148.5,141.901z"></path> </g> </g></svg>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const styles = (theme: Theme) => ({
  mapContainer: {
    height: 500,
    maxWidth: '90%',
    [theme.breakpoints.down('sm')]: {
      height: 200,
      maxWidth: '100%',
    },
  },
  popupTitle: {
    marginBottom: 5,
    paddingBottom: 0,
    '&>h2': {
      fontSize: 26,
      fontWeight: '600',
      lineHeight: '32px',
    },
  },
  popupHeadline: {
    fontSize: 16,
    lineHeight: '28px',
  },
  popupValue: {
    fontSize: 14,
    lineHeight: '24px',
    marginBottom: 15,
    color: '#6D727C',
  },
  dialogRoot: {
    zIndex: 9999999999999,
  },
  wrapper: {
    maxWidth: '80%',
    minWidth: 200,
    '& > div': {
      maxWidth: '80%',
      minWidth: 200,
    },
    [theme.breakpoints.down('sm')]: {
      left: 'unset',
      right: 8,
    },
  },
  icon: {
    color: '#fff',
  },
});

const useStyles = makeStyles(styles);

const Alert = React.forwardRef<HTMLDivElement, Record<string, unknown>>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface AddressValue extends Partial<Coordinates> {
  display_name?: string;
}

interface DraggableMarkerProps {
  value?: AddressValue | null;
  onChange: (position: L.LatLng) => void;
}

const DraggableMarker = ({ value, onChange }: DraggableMarkerProps) => {
  const markerRef = React.useRef<L.Marker>(null);

  const eventHandlers = React.useMemo(
    () => ({
      dragend() {
        const marker = markerRef?.current;

        if (marker != null) {
          const position = marker.getLatLng();
          onChange(position);
        }
      },
    }),
    [onChange],
  );

  if (!value) {
    return null;
  }

  return (
    <Marker
      {...({
        draggable: true,
        eventHandlers,
        position: value,
        icon: placeIcon,
      } as unknown as { position: L.LatLngExpression })}
      ref={markerRef}
    >
      {value ? <Popup>{value?.display_name}</Popup> : null}
    </Marker>
  );
};

interface MapProps {
  zoom?: number;
  mobileZoom?: number;
  maxZoom?: number;
  value?: AddressValue | null;
  description?: string;
  sample?: string;
  required?: boolean;
  error?: string;
  hidden?: boolean;
  onChange: (value: unknown) => void;
  actions: { setBusy: (busy: boolean) => void };
  readOnly?: boolean;
  center?: [number, number];
  maxBounds?: unknown;
  addressInitial?: string | null;
  rootDocument: { data: Record<string, unknown> };
  disableMapLimit?: boolean;
  minZoom?: number;
}

const Map = ({
  zoom = 10,
  mobileZoom = 10,
  maxZoom = 20,
  value,
  description = '',
  sample = '',
  required = false,
  error = '',
  hidden = false,
  onChange,
  actions,
  readOnly = false,
  center = [50.450001, 30.523333],
  maxBounds: maxBoundsOrigin = null,
  addressInitial = null,
  rootDocument,
  disableMapLimit = false,
  minZoom = 4,
}: MapProps) => {
  const t = useTranslate('Errors');
  const classes = useStyles();
  const dispatch = useDispatch() as unknown as (action: unknown) => void;
  const mapRefs = React.useRef(null);
  const snackbarRef = React.useRef(null);
  const [mapId, setMapId] = React.useState(generateUUID());
  const [noApiData, setNoApiData] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState<string | boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [mobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const geoCoordinates = React.useMemo(() => {
    const coordinates = (UkraineGeoJson as unknown as { features: Array<{ geometry: { coordinates: number[][][] } }> }).features[0].geometry.coordinates[0];
    return coordinates;
  }, []);

  const maxBounds = React.useMemo(() => {
    if (maxBoundsOrigin) {
      return maxBoundsOrigin;
    }

    if (disableMapLimit) {
      return null;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    geoCoordinates.forEach((coord) => {
      const [lng, lat] = coord;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const maxBounds = [
      [minLat, minLng],
      [maxLat, maxLng],
    ];

    return maxBounds;
  }, [maxBoundsOrigin, geoCoordinates, disableMapLimit]);

  const centerValue = React.useMemo(() => {
    if (value && value.lat && value.lng) {
      return [value.lat, value.lng] as [number, number];
    }

    return center;
  }, [value, center]);

  const checkBounds = React.useCallback(
    (coordinates: number[]) => {
      const isPointInPolygon = (point: number[], polygon: number[][]) => {
        const x = point[0];
        const y = point[1];

        let isInside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i][0];
          const yi = polygon[i][1];
          const xj = polygon[j][0];
          const yj = polygon[j][1];

          const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

          if (intersect) isInside = !isInside;

          if (xi === x && yi === y) {
            return true;
          }
        }

        return isInside;
      };

      const polygonSource = (maxBoundsOrigin || geoCoordinates) as number[][];

      if (disableMapLimit && !maxBoundsOrigin) {
        return true;
      }

      const coordinatesSource = maxBoundsOrigin
        ? coordinates
        : coordinates.reverse();

      return isPointInPolygon(coordinatesSource, polygonSource);
    },
    [geoCoordinates, maxBoundsOrigin, disableMapLimit],
  );

  const getAddressByCoordinates = React.useCallback(
    async (coordinates: Coordinates) => {
      const response = await fetch(API_URL(coordinates));

      if (response?.status !== 200) {
        dispatch(addMessage(new Message('GetAddressError', 'error')));
        return;
      }

      const data = await response.json();

      const {
        address: {
          city,
          district,
          municipality,
          postcode,
          road,
          state,
          suburb,
        },
        addresstype,
        display_name,
      } = data;

      return {
        ...coordinates,
        city,
        district,
        municipality,
        postcode,
        road,
        state,
        suburb,
        addresstype,
        display_name,
      };
    },
    [dispatch],
  );

  const geoCoordinatesByAddress = React.useCallback(
    async (address: string) => {
      const response = await fetch(AP_URL_RAW(address));

      if (response?.status !== 200) {
        dispatch(addMessage(new Message('GetAddressError', 'error')));
        return;
      }

      const data = await response.json();

      return data;
    },
    [dispatch],
  );

  const handleCloseSnackbar = React.useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleChange = React.useCallback(
    async (coordinates: Coordinates, force = false, callback?: () => void) => {
      if (readOnly && !force) return;

      if (!checkBounds([coordinates.lat, coordinates.lng])) {
        setSnackbarOpen(t('OutOfBoundError'));
        return;
      }

      actions.setBusy(true);

      const addressObject = await getAddressByCoordinates(coordinates);

      if (addressObject) {
        onChange(addressObject);
      }

      actions.setBusy(false);

      callback && callback();
    },
    [onChange, actions, readOnly, t, checkBounds, getAddressByCoordinates],
  );

  const isSnackbarSlicked = React.useCallback((e: { target?: { _container?: { children?: unknown } } }) => {
    const clickedElements = e?.target?._container?.children;
    const isSnackbar = Array.from(clickedElements as ArrayLike<unknown>).some(
      (el) => el === snackbarRef.current,
    );
    return isSnackbar;
  }, []);

  const LocationFinder = () => {
    useMapEvents({
      dblclick() {
        waiter.removeAction(mapId);
      },
      click(e: { latlng: { lat: number; lng: number }; target?: { _container?: { children?: unknown } } }) {
        setSnackbarOpen(false);

        const inBounds = checkBounds([e.latlng.lat, e.latlng.lng]);

        if (isSnackbarSlicked(e) && isFullscreen && !inBounds) {
          setSnackbarOpen(t('OutOfBoundError'));
          return;
        } else if (isSnackbarSlicked(e) && isFullscreen && inBounds) {
          setSnackbarOpen(false);
        }

        waiter.addAction(mapId, () => handleChange(e.latlng), 250);
      },
      enterFullscreen() {
        setIsFullscreen(true);
      },
      exitFullscreen() {
        setIsFullscreen(false);
      },
    } as never);
    return null;
  };

  const SnackBarMemo = React.useMemo(() => {
    return (
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={!!snackbarOpen}
        ref={snackbarRef}
        {...({ variant: 'error' } as unknown as Record<string, unknown>)}
        classes={{
          root: classes.wrapper,
        }}
      >
        <Alert
          icon={false as never}
          severity={'error'}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleCloseSnackbar}
            >
              <CloseIcon className={classes.icon} />
            </IconButton>
          }
        >
          {snackbarOpen}
        </Alert>
      </Snackbar>
    );
  }, [snackbarOpen, classes, handleCloseSnackbar]);

  const findAddressElement = React.useCallback((elements: AddressValue[] | null, search: string) => {
    if (!elements) return null;

    try {
      const city = (search || '').split(',')[0].toLowerCase();

      const element = elements.find((el) => {
        const display_name = el?.display_name || '';

        const addressParts = display_name.split(',');

        addressParts.forEach((part, index) => {
          addressParts[index] = part.toLowerCase().trim();
        });

        if (addressParts.some((part) => (part || '').indexOf(city) !== -1)) {
          return true;
        }

        return false;
      });

      if (element) {
        return element;
      }

      return false;
    } catch (e) {
      return null;
    }
  }, []);

  React.useEffect(() => {
    const parseQuery = async () => {
      if (!history?.location?.search && !addressInitial) {
        return;
      }

      const query =
        (qs.parse(history?.location?.search, { ignoreQueryPrefix: true }) as Record<string, string>) || {};

      if (
        Object.keys(query).includes('lat') &&
        Object.keys(query).includes('lng')
      ) {
        const coordinates = {
          lat: parseFloat(query.lat),
          lng: parseFloat(query.lng),
        };

        if (Number.isNaN(coordinates.lat) || Number.isNaN(coordinates.lng)) {
          return;
        }

        handleChange(coordinates, true);

        history.push(history.location.pathname);
      }

      if (
        (Object.keys(query).includes('address') || addressInitial) &&
        !value &&
        !noApiData
      ) {
        await processList.hasOrSet('getAddressAction', async () => {
          let addressSource: unknown = query.address || addressInitial;

          if (addressInitial) {
            addressSource = evaluate(addressInitial, rootDocument.data);

            // `addressInitial` is a string prop, so this check is always false at
            // runtime — a pre-existing dead branch, preserved as-is rather than
            // "fixed" (e.g. by checking `addressSource` instead).
            if ((addressInitial as unknown) instanceof Error) {
              addressSource = objectPath.get(rootDocument.data, addressInitial);
            }
          }

          if (!addressSource) {
            return;
          }

          const data = await geoCoordinatesByAddress(
            sanitizeHtml(addressSource as string),
          );

          if (data && data.length > 0) {
            const addressItem = findAddressElement(data, addressSource as string);

            if (addressItem) {
              const { lat, lon } = addressItem as unknown as { lat: string; lon: string };

              handleChange(
                {
                  lat: parseFloat(lat),
                  lng: parseFloat(lon),
                },
                true,
                () => {
                  setMapId(generateUUID());
                },
              );
            } else {
              setNoApiData(true);
            }
          } else {
            setNoApiData(true);
          }

          history.push(history.location.pathname);
        });
      }
    };

    parseQuery();
  }, [
    handleChange,
    zoom,
    geoCoordinatesByAddress,
    findAddressElement,
    addressInitial,
    rootDocument,
    value,
    noApiData,
  ]);

  if (hidden) {
    return null;
  }

  return (
    <ElementContainer
      description={description}
      sample={sample}
      required={required}
      error={error}
      bottomSample={true}
      maxWidth={'100%'}
    >
      <div className={classes.mapContainer}>
        <MapContainer
          ref={mapRefs}
          center={centerValue}
          zoom={mobile ? mobileZoom : zoom}
          maxZoom={maxZoom}
          minZoom={minZoom}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
          maxBounds={maxBounds as never}
          maxBoundsViscosity={0.95}
          key={mapId}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={maxZoom}
          />
          <DraggableMarker value={value} onChange={handleChange as never} />
          <FullscreenControl />
          <LocationFinder />
          {isFullscreen && SnackBarMemo}
        </MapContainer>
        {!isFullscreen && SnackBarMemo}
      </div>
    </ElementContainer>
  );
};

export default Map;
