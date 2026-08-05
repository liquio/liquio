import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators } from 'redux';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { IconButton, Tooltip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { addFavorites, deleteFavorites, getFavorites } from 'actions/favorites';

const styles = (theme) => ({
  iconFilled: {
    fill: theme?.buttonBg,
  },
});

const useStyles = makeStyles(styles);

const Favorites = ({
  element,
  type,
  actions,
  workflowList,
  unitsList,
  registersList,
  name,
}) => {
  const t = useTranslate('FavoritesPage');
  const classes = useStyles();

  const list = [...workflowList, ...unitsList, ...registersList];

  const isFavorite = !!list.find(
    ({ entity_id }) => entity_id + '' === element?.id + '',
  );

  const handleToggleFavorite = async () => {
    const body = name ? { name } : null;

    const regBody = {
      entity: type,
      id: element?.id,
      body,
    };

    if (isFavorite) {
      await actions.deleteFavorites(regBody);
    } else {
      await actions.addFavorites(regBody);
    }

    await actions.getFavorites({ entity: type });
  };

  const title = isFavorite ? t('RemoveFromFavorites') : t('AddToFavorites');

  return (
    <Tooltip title={title}>
      <IconButton onClick={handleToggleFavorite} size="large">
        {isFavorite ? (
          <StarIcon className={classes.iconFilled} />
        ) : (
          <StarBorderIcon />
        )}
      </IconButton>
    </Tooltip>
  );
};

const mapStateToProps = ({
  favorites: { workflow_templates, units, registers },
}) => ({
  workflowList: workflow_templates,
  unitsList: units,
  registersList: registers,
});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Favorites);
