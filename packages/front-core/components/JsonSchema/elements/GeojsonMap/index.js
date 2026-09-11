import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import { useTranslate } from 'react-translate';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { makeStyles } from '@mui/styles';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import evaluate from 'helpers/evaluate';
import diff from 'helpers/diff';
import 'leaflet/dist/leaflet.css';
import moment from 'moment';
import renderHTML from 'helpers/renderHTML';

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
  customBlackTooltip: {
    backgroundColor: '#000 !important',
    color: '#fff !important',
    border: 'none !important',
    boxShadow: 'none !important',
    padding: '5px !important',
    opacity: 1,
  },
  tooltipArrow: {
    '&::before': {
      borderBottomColor: '#000 !important',
    },
  },
});

const useStyles = makeStyles(styles);

const GeojsonMap = ({
  position,
  zoom = 10,
  maxZoom = 30,
  dataPath,
  rootDocument,
  fieldsToDisplay,
  onChange,
  value,
  description,
  sample,
  required,
  error,
  hidden,
  checkPlaceActive,
  disableLayer,
  typography,
  goodsType,
  readOnly,
}) => {
  const t = useTranslate('GeojsonMap');
  const classes = useStyles();

  const [popupContent, setPopupContent] = React.useState(null);
  const [mapKey, setMapKey] = React.useState(0);
  const geoRefs = React.useRef(null);
  const mapRefs = React.useRef(null);

  const fitBounds = React.useCallback(() => {
    if (!geoRefs?.current || !mapRefs?.current) return;
    if (mapRefs?.current.getZoom() > 10) return;

    mapRefs?.current.fitBounds(geoRefs.current.getBounds());

    mapRefs?.current.zoomOut(1);
  }, [geoRefs, mapRefs]);

  const geoJson = React.useMemo(() => {
    try {
      if (!dataPath) {
        return null;
      }

      const geoJsonData = evaluate(dataPath, rootDocument?.data);

      if (geoJsonData instanceof Error) {
        return objectPath.get(rootDocument.data, dataPath);
      }

      return geoJsonData;
    } catch {
      return null;
    }
  }, [dataPath, rootDocument]);

  const onEachFeature = React.useCallback(
    (feature, layer) => {
      const showDialog = () => !readOnly && setPopupContent(feature.properties);

      const evalGoodsType = evaluate(goodsType, rootDocument.data);
      const booking =
        feature?.properties?.booking_time &&
        moment
          .utc()
          .diff(moment.utc(feature?.properties?.booking_time), 'minutes') <= 15;
      const blocked =
        feature?.properties?.payment_status &&
        feature?.properties?.payment_status === 1 &&
        !feature?.properties?.isBlocked &&
        !feature?.properties?.is_reserve_cancelled &&
        !feature?.properties?.isCancel;
      const layerDisable =
        evaluate(disableLayer, feature.properties, rootDocument.data) ||
        !feature?.properties?.goods_type ||
        !goodsType ||
        booking ||
        blocked;
      const layerSelected = !diff(feature?.properties, value);
      const layerActive = feature?.properties?.goods_type === evalGoodsType;
      const border = !feature?.properties?.guid_zone;

      let tooltipText = t('tooltipTextNotActive');
      if (layerDisable) {
        tooltipText = t('tooltipTextDisable');
      } else if (layerActive || !goodsType) {
        tooltipText = t('tooltipTextActive');
      }

      const baseStyle = {
        opacity: 1,
        fillOpacity: 1,
      };

      let layerStyle = {};
      if (layerSelected) {
        layerStyle = { ...baseStyle, color: '#f88d81', fillColor: '#E0D7E7' };
      } else if (layerDisable) {
        layerStyle = { ...baseStyle, color: '#444444', fillColor: '#767676' };
        layer.on({
          click: () => setMapKey((prevKey) => prevKey + 1),
        });
      } else if (goodsType && layerActive) {
        layerStyle = { ...baseStyle, color: '#004D1A', fillColor: '#2C6B49' };
      } else if (goodsType && !layerActive && !layerDisable && !border) {
        layerStyle = { ...baseStyle, color: '#682300', fillColor: '#A06D48' };
      }

      if (border) {
        layerStyle = {
          color: 'rgb(51, 136, 255)',
          fillColor: 'rgb(153, 186, 229)',
          opacity: 1,
          fillOpacity: 1,
        };
      }

      layer.setStyle(layerStyle);

      if (!border && !layerDisable) {
        layer.on({ click: showDialog });
      }

      if (!border) {
        layer.bindTooltip(tooltipText, {
          permanent: false,
          direction: 'bottom',
          className: `${classes.customBlackTooltip} ${classes.tooltipArrow}`,
        });
      }
    },
    [disableLayer, rootDocument, value, goodsType, classes, t, readOnly],
  );

  const handleChose = React.useCallback(() => {
    onChange(popupContent);
    setPopupContent(null);
    setMapKey((prevKey) => prevKey + 1);
  }, [popupContent, onChange]);

  const handleDelete = React.useCallback(() => {
    onChange(null);
    setPopupContent(null);
    setMapKey((prevKey) => prevKey + 1);
  }, [onChange]);

  const renderFields = (popupContent) => {
    return fieldsToDisplay
      .filter((field) => popupContent?.[field])
      .map((field) => (
        <div key={field}>
          <Typography className={classes.popupHeadline}>{t(field)}</Typography>
          <Typography className={classes.popupValue}>
            {popupContent?.[field]}
          </Typography>
        </div>
      ));
  };

  const placeActive = React.useMemo(() => {
    const isActiveResult = evaluate(
      checkPlaceActive,
      popupContent,
      rootDocument.data,
    );
    return isActiveResult;
  }, [checkPlaceActive, rootDocument, popupContent]);

  React.useEffect(() => {
    setTimeout(() => {
      fitBounds();
    }, 500);
  }, [fitBounds, geoJson]);

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
      variant={typography}
    >
      <div className={classes.mapContainer}>
        <MapContainer
          ref={mapRefs}
          center={position}
          zoom={zoom}
          maxZoom={maxZoom}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={maxZoom}
          />

          {geoJson ? (
            <GeoJSON
              key={mapKey}
              ref={geoRefs}
              data={geoJson}
              onEachFeature={onEachFeature}
            />
          ) : null}
        </MapContainer>

        {popupContent ? (
          <Dialog
            open={true}
            fullWidth={true}
            maxWidth={'sm'}
            scroll={'body'}
            onClose={() => {
              setPopupContent(null);
              setMapKey((prevKey) => prevKey + 1);
            }}
            classes={{
              root: classes.dialogRoot,
            }}
          >
            <DialogTitle className={classes.popupTitle}>
              {placeActive?.text ? null : popupContent?.address}
            </DialogTitle>
            <DialogContent>
              {placeActive?.text ? (
                <Typography className={classes.popupHeadline}>
                  {renderHTML(placeActive?.text)}
                </Typography>
              ) : (
                renderFields(popupContent)
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setPopupContent(null);
                  setMapKey((prevKey) => prevKey + 1);
                }}
                color="primary"
                aria-label={t('Close')}
              >
                {t('Close')}
              </Button>
              {diff(popupContent, value) ? (
                <>
                  {placeActive?.active ? (
                    <Button
                      onClick={handleChose}
                      color="primary"
                      variant="contained"
                      aria-label={t('Chose')}
                    >
                      {t('Chose')}
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  onClick={handleDelete}
                  color="primary"
                  variant="outlined"
                  aria-label={t('Delete')}
                >
                  {t('Delete')}
                </Button>
              )}
            </DialogActions>
          </Dialog>
        ) : null}
      </div>
    </ElementContainer>
  );
};

GeojsonMap.propTypes = {
  position: PropTypes.array,
  zoom: PropTypes.number,
  dataPath: PropTypes.string,
  maxZoom: PropTypes.number,
  fieldsToDisplay: PropTypes.array,
  onChange: PropTypes.func,
  description: PropTypes.string,
  sample: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.string,
  hidden: PropTypes.bool,
  checkPlaceActive: PropTypes.string,
  disableLayer: PropTypes.string,
};

GeojsonMap.defaultProps = {
  position: [50.450001, 30.523333],
  zoom: 10,
  dataPath: null,
  maxZoom: 20,
  fieldsToDisplay: [
    'zone_type',
    'rental_price',
    'status',
    'organizer',
    'orgnzr_phone_number',
  ],
  onChange: () => {},
  description: '',
  sample: '',
  required: false,
  error: '',
  hidden: false,
  checkPlaceActive: '() => { return { active: true }; }',
  disableLayer: '({ payment_status }) => { return false; }',
};

export default GeojsonMap;
