/* eslint-disable camelcase */
import React from 'react';
import PropTypes from 'prop-types';
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
import UkraineGeoJson from './UkraineGeoJson.js';

const API_URL = ({ lat, lng }) =>
  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uk`;

const AP_URL_RAW = (address) =>
  `https://nominatim.openstreetmap.org/search?format=json&q=${address}&accept-language=uk`;

const placeIcon = L.divIcon({
  className: 'custom-icon',
  html: '<svg fill="#000000" height="24px" width="24px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 297 297" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M148.5,0C87.43,0,37.747,49.703,37.747,110.797c0,91.026,99.729,179.905,103.976,183.645 c1.936,1.705,4.356,2.559,6.777,2.559c2.421,0,4.841-0.853,6.778-2.559c4.245-3.739,103.975-92.618,103.975-183.645 C259.253,49.703,209.57,0,148.5,0z M148.5,272.689c-22.049-21.366-90.243-93.029-90.243-161.892 c0-49.784,40.483-90.287,90.243-90.287s90.243,40.503,90.243,90.287C238.743,179.659,170.549,251.322,148.5,272.689z"></path> <path d="M148.5,59.183c-28.273,0-51.274,23.154-51.274,51.614c0,28.461,23.001,51.614,51.274,51.614 c28.273,0,51.274-23.153,51.274-51.614C199.774,82.337,176.773,59.183,148.5,59.183z M148.5,141.901 c-16.964,0-30.765-13.953-30.765-31.104c0-17.15,13.801-31.104,30.765-31.104c16.964,0,30.765,13.953,30.765,31.104 C179.265,127.948,165.464,141.901,148.5,141.901z"></path> </g> </g></svg>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const styles = (theme) => ({
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

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const DraggableMarker = ({ value, onChange }) => {
  const markerRef = React.useRef(null);

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
      draggable={true}
      eventHandlers={eventHandlers}
      position={value}
      ref={markerRef}
      icon={placeIcon}
    >
      {value ? <Popup>{value?.display_name}</Popup> : null}
    </Marker>
  );
};

const Map = ({
  zoom,
  mobileZoom,
  maxZoom,
  value,
  description,
  sample,
  required,
  error,
  hidden,
  onChange,
  actions,
  readOnly,
  center,
  maxBounds: maxBoundsOrigin,
  addressInitial,
  rootDocument,
  disableMapLimit,
  minZoom,
}) => {
  const t = useTranslate('Errors');
  const classes = useStyles();
  const dispatch = useDispatch();
  const mapRefs = React.useRef(null);
  const snackbarRef = React.useRef(null);
  const [mapId, setMapId] = React.useState(crypto.randomUUID());
  const [noApiData, setNoApiData] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [mobile] = React.useState(() => {
    const md = new MobileDetect(window.navigator.userAgent);
    const isMobile = !!md.mobile();
    return isMobile;
  });

  const geoCoordinates = React.useMemo(() => {
    const coordinates = UkraineGeoJson.features[0].geometry.coordinates[0];
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
      return [value.lat, value.lng];
    }

    return center;
  }, [value, center]);

  const checkBounds = React.useCallback(
    (coordinates) => {
      const isPointInPolygon = (point, polygon) => {
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

      let polygonSource = maxBoundsOrigin || geoCoordinates;

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
    async (coordinates) => {
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
    async (address) => {
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
    async (coordinates, force = false, callback) => {
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

  const isSnackbarSlicked = React.useCallback((e) => {
    const clickedElements = e?.target?._container?.children;
    const isSnackbar = Array.from(clickedElements).some(
      (el) => el === snackbarRef.current,
    );
    return isSnackbar;
  }, []);

  const LocationFinder = () => {
    useMapEvents({
      dblclick() {
        waiter.removeAction(mapId);
      },
      click(e) {
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
    });
    return null;
  };

  const SnackBarMemo = React.useMemo(() => {
    return (
      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={snackbarOpen}
        ref={snackbarRef}
        variant="error"
        classes={{
          root: classes.wrapper,
        }}
      >
        <Alert
          icon={false}
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

  const findAddressElement = React.useCallback((elements, search) => {
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
        qs.parse(history?.location?.search, { ignoreQueryPrefix: true }) || {};

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
          let addressSource = query.address || addressInitial;

          if (addressInitial) {
            addressSource = evaluate(addressInitial, rootDocument.data);

            if (addressInitial instanceof Error) {
              addressSource = objectPath.get(rootDocument.data, addressInitial);
            }
          }

          if (!addressSource) {
            return;
          }

          const data = await geoCoordinatesByAddress(
            sanitizeHtml(addressSource),
          );

          if (data && data.length > 0) {
            const addressItem = findAddressElement(data, addressSource);

            if (addressItem) {
              const { lat, lon } = addressItem;

              handleChange(
                {
                  lat: parseFloat(lat),
                  lng: parseFloat(lon),
                },
                true,
                () => {
                  setMapId(crypto.randomUUID());
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
          maxBounds={maxBounds}
          maxBoundsViscosity={0.95}
          key={mapId}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={maxZoom}
          />
          <DraggableMarker value={value} onChange={handleChange} />
          <FullscreenControl />
          <LocationFinder />
          {isFullscreen && SnackBarMemo}
        </MapContainer>
        {!isFullscreen && SnackBarMemo}
      </div>
    </ElementContainer>
  );
};

Map.propTypes = {
  zoom: PropTypes.number,
  maxZoom: PropTypes.number,
  minZoom: PropTypes.number,
  onChange: PropTypes.func,
  description: PropTypes.string,
  sample: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hidden: PropTypes.bool,
  value: PropTypes.object,
  readOnly: PropTypes.bool,
  center: PropTypes.array,
  maxBounds: PropTypes.array,
  addressInitial: PropTypes.string,
  disableMapLimit: PropTypes.bool,
  mobileZoom: PropTypes.number,
};

Map.defaultProps = {
  zoom: 10,
  maxZoom: 20,
  minZoom: 4,
  onChange: () => {},
  description: '',
  sample: '',
  required: false,
  error: '',
  hidden: false,
  value: null,
  readOnly: false,
  center: [50.450001, 30.523333],
  maxBounds: null,
  addressInitial: null,
  disableMapLimit: false,
  mobileZoom: 10,
};

export default Map;
