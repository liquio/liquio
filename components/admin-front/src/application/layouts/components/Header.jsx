import { ArrowBack as ArrowBackIcon, Menu as MenuIcon } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, IconButton, Popover, TextField, Toolbar, Typography } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { translate } from 'react-translate';

import { modules } from 'application';
import { addTagToWorkflow, getTagList } from 'application/actions/tags';
import BpmnAi from 'components/BpmnAi';
import ProgressLine from 'components/Preloader/ProgressLine';
import Snackbars from 'components/Snackbars';
import { getConfig } from 'core/helpers/configLoader';
import checkAccess from 'helpers/checkAccess';
import RenderOneLine from 'helpers/renderOneLine';

const styles = (theme) => ({
  menuButton: {
    color: '#fff',
    padding: 0,
    marginRight: 16,
    [theme.breakpoints.up('sm')]: {
      display: 'none'
    }
  },
  header: {
    position: 'relative'
  },
  headerContent: {
    padding: theme.header.padding,
    color: theme.header.textColor,
    boxShadow: 'none'
  },
  toolbar: {
    padding: '0',
    minHeight: 'auto',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  userInfo: {
    justifyContent: 'flex-end'
  },
  iconButtonRoot: {
    width: 40,
    height: 40
  },
  backLink: {
    color: '#fff',
    alignContent: 'center',
    display: 'flex',
    justifyContent: 'center'
  },
  content: {
    paddingRight: 16,
    display: 'flex',
    alignItems: 'center',
    flex: '0 1 100%',
    borderBottom: theme.header.middle.border,
    backgroundColor: theme.header.background,
    [theme.breakpoints.down('lg')]: {
      justifyContent: 'space-between'
    },
    [theme.breakpoints.down('sm')]: {
      paddingLeft: 16,
      display: 'block'
    }
  },
  left: {
    flex: '0 0 100%',
    padding: '14px 11px',
    alignSelf: 'stretch',
    [theme.breakpoints.up('sm')]: {
      maxWidth: 250
    },
    [theme.breakpoints.up('md')]: {
      borderRight: theme.header.middle.border
    },
    [theme.breakpoints.down('md')]: {
      padding: '8px 0',
      borderTop: theme.header.middle.border,
      borderBottom: theme.header.middle.border
    }
  },
  leftTitle: {
    fontWeight: 500,
    fontSize: '20px',
    lineHeight: '24px',
    color: theme.header.textColor,
    marginBottom: 8
  },
  leftSubTitle: {
    fontSize: '14px',
    lineHeight: '20px',
    color: theme.header.leftSubTitle.color,
    letterSpacing: '0.25px'
  },
  leftSubTitleWrap: {
    display: 'flex',
    alignItems: 'center'
  },
  leftLabel: {
    fontWeight: 500,
    fontSize: 12,
    lineHeight: 1,
    color: theme.header.leftLabel.color,
    width: '45px',
    borderRadius: 50,
    padding: '2px 0 4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16
  },
  leftLabelStage: {
    background: theme.header.leftLabelStage.background
  },
  leftLabelProd: {
    background: theme.header.leftLabelStage.background
  },
  middle: {
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
    flex: '0 1 100%',
    '& *': {
      color: theme.header.textColor,
      [theme.breakpoints.down('lg')]: {
        fontSize: 28
      }
    }
  },
  right: {
    flex: '0 0 100%',
    padding: '12px 0',
    display: 'flex',
    [theme.breakpoints.up('sm')]: {
      maxWidth: 284,
      alignSelf: 'stretch',
      padding: '16px 0 16px 16px'
    },
    [theme.breakpoints.up('md')]: {
      borderLeft: theme.header.middle.border
    },
    [theme.breakpoints.down('lg')]: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  },
  rightText: {
    maxWidth: '0 1 100%'
  },
  progressLine: {
    height: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    '& > div': {
      height: 4
    }
  },
  headline: {
    width: '100%'
  },
  middleWrap: {
    width: '100%',
    padding: '8px 0 16px',
    [theme.breakpoints.up('md')]: {
      padding: '16px'
    }
  },
  tagsWrap: {
    marginTop: '18px',
    display: 'flex',
    gap: 9
  },
  iconBtn: {
    border: '1px solid #797979',
    borderRadius: '50%',
    color: '#797979',
    padding: '2px',
    fontSize: '12px',
    '& svg': {
      fontSize: '12px'
    }
  },
  hidden: {
    opacity: 0,
    position: 'relative',
    zIndex: -1
  },
  dropdown: {
    borderRadius: '2px',
    padding: '9px 14px 22px 14px',
    backgroundColor: '#404040',
    marginTop: '10px',
    width: 247
  },
  searchWrap: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  search: {
    '& .MuiInputBase-root': {
      borderRadius: '3px 3px 0px 0px',
      backgroundColor: '#2F2F2F'
    },
    '& :before': {
      borderBottom: 'none'
    },
    '& .MuiInputBase-input': {
      padding: '8px',
      fontSize: '14px'
    }
  },
  closeIcon: {
    paddingRight: 0,
    '&:hover': {
      backgroundColor: 'transparent'
    },
    '& svg': {
      width: '16px',
      height: '16px'
    }
  },
  tagList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    maxHeight: '138px',
    overflowY: 'auto'
  },
  tagName: {
    color: 'rgba(255, 255, 255, .7)',
    borderRadius: '48px',
    fontSize: '12px',
    lineHeight: '14px',
    textAlign: 'center',
    padding: '1px 6px',
    height: 18,
    cursor: 'pointer'
  },
  selectedTagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 9
  },
  deleteIcon: {
    padding: 0,
    '&:hover': {
      backgroundColor: 'transparent'
    },
    '& svg': {
      width: '10px',
      height: '10px'
    }
  },
  emptyTitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.80)',
    lineHeight: '18px',
    marginBottom: '12px'
  },
  emptyDescription: {
    margin: 0,
    fontSize: '12px',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.60)',
    lineHeight: '18px'
  }
});

const Header = ({
  t,
  classes,
  title,
  loading,
  envStage,
  errors,
  actions,
  userUnits,
  userInfo,
  backButton,
  onDrawerToggle,
  hideMenuButton,
  workflowId,
  workflowTags
}) => {
  const {
    application: { name: envName, environment: env }
  } = getConfig();

  const stage = envStage.includes(env);
  const dispatch = useDispatch();
  const widgets = [].concat(...modules.map((module) => module.appbar || []));

  const checkAccessWrapp = ({ access }) => !access || checkAccess(access, userInfo, userUnits);

  const externalCommand = useSelector((state) => state.bpmnAi.externalCommand);

  const isAddTags = checkAccess({ userHasUnit: [1000003, 1000002] }, userInfo, userUnits);

  const [anchorEl, setAnchorEl] = useState(null);
  const [tagsList, setTagsList] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchValue, setSearchValue] = useState('');

  const availableTags = useMemo(() => {
    return tagsList.filter(
      (tag) =>
        !selectedTags.find((item) => item.id === tag.id) &&
        tag.name.toLowerCase().indexOf(searchValue.toLowerCase()) !== -1
    );
  }, [tagsList, selectedTags, searchValue]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const renderBackButton = () => (
    <>
      {backButton ? (
        <Link to={backButton} className={classes.backLink}>
          <IconButton
            classes={{
              root: classes.iconButtonRoot
            }}
            size="large"
          >
            <ArrowBackIcon />
          </IconButton>
        </Link>
      ) : (
        <>
          {!hideMenuButton ? (
            <IconButton
              aria-label="Open drawer"
              onClick={onDrawerToggle}
              className={classes.menuButton}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          ) : null}
        </>
      )}
    </>
  );

  const applyOpacity = (color, opacity) => {
    return color.replace(/[\d\.]+\)$/g, `${opacity})`);
  };

  const selectTag = useCallback(
    (tag) => {
      setSelectedTags((prevTags) => {
        const updatedTags = [...prevTags, tag];

        dispatch(
          addTagToWorkflow(workflowId, {
            tagIds: updatedTags.map((item) => item.id)
          })
        );

        updatedTags.length === 10 && handleClose();

        return updatedTags;
      });
    },
    [selectedTags, workflowId]
  );

  const deleteTag = useCallback(
    (tag) => {
      setSelectedTags((prevTags) => {
        const updatedTags = [...prevTags.filter((item) => item.id !== tag.id)];

        dispatch(
          addTagToWorkflow(workflowId, {
            tagIds: updatedTags.map((item) => item.id)
          })
        );

        return updatedTags;
      });
    },
    [selectedTags, workflowId]
  );

  useEffect(() => {
    if (workflowId && isAddTags && !tagsList.length) {
      const fetchData = async () => {
        const result = await dispatch(getTagList('short=true'));
        setTagsList(result);
      };
      fetchData();
    }

    if (Array.isArray(workflowTags)) {
      setSelectedTags(workflowTags);
    }
  }, [workflowId, isAddTags, workflowTags]);

  return (
    <header className={classes.header}>
      <Snackbars errors={errors} onClose={(errorIndex) => () => actions.closeError(errorIndex)} />

      <ProgressLine loading={loading} classCustom={classes.progressLine} />

      <BpmnAi fromCodeEditor={false} externalCommand={externalCommand} />

      <AppBar className={classes.headerContent} position="relative" elevation={1} component="div">
        <Toolbar className={classes.toolbar}>
          <div className={classes.content}>
            <div className={classes.left}>
              <div className={classes.leftTitle}>{envName}</div>
              <div className={classes.leftSubTitleWrap}>
                <div className={classes.leftSubTitle}>{t('AdminPanel')}</div>
                <div
                  className={classNames(
                    classes.leftLabel,
                    stage ? classes.leftLabelStage : classes.leftLabelProd
                  )}
                >
                  {stage ? 'stage' : 'prod'}
                </div>
              </div>
            </div>

            <div className={classes.middleWrap}>
              <div className={classes.middle}>
                {renderBackButton()}
                <Typography variant="h4" className={classes.headline}>
                  <RenderOneLine title={title} textParams={'400 30px Roboto'} />
                </Typography>
              </div>
              {workflowId && isAddTags ? (
                <>
                  <div className={classes.tagsWrap}>
                    <div className={classes.selectedTagsList}>
                      {selectedTags.map((tag) => (
                        <div
                          key={tag.id || tag.name}
                          className={classes.tagName}
                          style={{
                            backgroundColor: applyOpacity(tag.color, 0.2),
                            border: `1px solid ${applyOpacity(tag.color, 0.4)}`
                          }}
                        >
                          {tag.name}{' '}
                          <IconButton
                            size="small"
                            onClick={() => deleteTag(tag)}
                            className={classes.deleteIcon}
                          >
                            <CloseIcon style={{ color: `${applyOpacity(tag.color, 0.4)}` }} />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                    <IconButton
                      className={classNames({
                        [classes.iconBtn]: true,
                        [classes.hidden]: selectedTags.length === 10
                      })}
                      color="primary"
                      onClick={handleOpen}
                    >
                      <AddIcon />
                    </IconButton>
                  </div>
                  <Popover
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'center'
                    }}
                    PaperProps={{
                      className: classes.dropdown
                    }}
                  >
                    <div className={classes.dropdownWrap}>
                      <div className={classes.searchWrap}>
                        <TextField
                          variant="filled"
                          placeholder=""
                          className={classes.search}
                          onChange={(e) => setSearchValue(e.target.value)}
                        />
                        <IconButton
                          size="small"
                          onClick={handleClose}
                          className={classes.closeIcon}
                        >
                          <CloseIcon />
                        </IconButton>
                      </div>

                      <div className={classes.tagList}>
                        {availableTags.length ? (
                          availableTags.map((tag) => (
                            <div
                              key={tag.id || tag.name}
                              className={classes.tagName}
                              style={{
                                backgroundColor: applyOpacity(tag.color, 0.2),
                                border: `1px solid ${applyOpacity(tag.color, 0.4)}`
                              }}
                              onClick={() => selectTag(tag)}
                            >
                              {tag.name}
                            </div>
                          ))
                        ) : (
                          <div>
                            <p className={classes.emptyTitle}>{t('EmptyTitle')}</p>
                            <p className={classes.emptyDescription}>{t('EmptyDescription')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popover>
                </>
              ) : null}
            </div>

            <div className={classes.right}>
              {widgets.filter(checkAccessWrapp).map((widget, key) => (
                <widget.component key={key} />
              ))}
            </div>
          </div>
        </Toolbar>
      </AppBar>
    </header>
  );
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
  onDrawerToggle: PropTypes.func.isRequired,
  hideMenuButton: PropTypes.bool,
  envStage: PropTypes.array.isRequired
};

Header.defaultProps = {
  hideMenuButton: false,
  envStage: ['test', 'stage', 'dev', 'development', 'stage-liquio']
};

const mapStateToProps = ({ auth: { userUnits, info } }) => ({
  userUnits,
  userInfo: info
});

const translated = translate('Navigator')(Header);

const connected = connect(mapStateToProps)(translated);

export default withStyles(styles)(connected);
