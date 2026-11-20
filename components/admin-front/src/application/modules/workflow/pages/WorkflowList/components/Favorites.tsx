import React from 'react';
import { connect } from 'react-redux';
import { useTranslate } from 'react-translate';
import { bindActionCreators, Dispatch } from 'redux';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { IconButton, Tooltip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Theme } from '@mui/material/styles';
import { addFavorites, deleteFavorites, getFavorites } from 'actions/favorites';

const styles = (theme: Theme & { buttonBg?: string }) => ({
  iconFilled: {
    fill: theme?.buttonBg,
  },
});

const useStyles = makeStyles(styles as never);

interface FavoriteItem {
  entity_id?: string | number;
  [key: string]: unknown;
}

interface FavoritesProps {
  element?: { id?: string | number };
  type: string;
  actions: {
    deleteFavorites: (params: { entity: string; id?: string | number; body?: unknown }) => Promise<unknown>;
    addFavorites: (params: { entity: string; id?: string | number; body?: unknown }) => Promise<unknown>;
    getFavorites: (params: { entity: string }) => Promise<unknown>;
  };
  workflowList: FavoriteItem[];
  unitsList: FavoriteItem[];
  registersList: FavoriteItem[];
  name?: string;
}

const Favorites = ({
  element,
  type,
  actions,
  workflowList,
  unitsList,
  registersList,
  name,
}: FavoritesProps) => {
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

interface FavoritesState {
  favorites: {
    workflow_templates: FavoriteItem[];
    units: FavoriteItem[];
    registers: FavoriteItem[];
  };
}

const mapStateToProps = ({
  favorites: { workflow_templates, units, registers },
}: FavoritesState) => ({
  workflowList: workflow_templates,
  unitsList: units,
  registersList: registers,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    deleteFavorites: bindActionCreators(deleteFavorites, dispatch),
    addFavorites: bindActionCreators(addFavorites, dispatch),
    getFavorites: bindActionCreators(getFavorites, dispatch),
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Favorites as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
