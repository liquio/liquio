import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import AddIcon from '@mui/icons-material/Add';
import StringElement from 'components/JsonSchema/elements/StringElement';
import {
  createTag,
  updateTag,
  deleteTag,
  getTagList,
} from 'application/actions/tags';

const styles = (theme) => ({
  formControl: {
    marginBottom: 30,
  },
  darkThemeLabel: {
    '& fieldset': {
      borderColor: 'transparent',
    },
    '& label': {
      color: '#fff',
    },
  },
  buttonsWrapper: {
    display: 'flex',
    '& button': {
      flex: 1,
    },
    [theme.breakpoints.down('md')]: {
      width: '100%',
      marginTop: '10px',
    },
  },
  colorsWrapper: {
    display: 'flex',
    gap: '17px 10px',
    maxWidth: '266px',
    marginBottom: 44,
    flexWrap: 'wrap',
  },
  colorsItem: {
    borderRadius: '48px',
    fontSize: '12px',
    lineHeight: '14px',
    textAlign: 'center',
    padding: '1px 0',
    width: '82px',
    cursor: 'pointer',
  },
  deleteIcon: {
    fill: theme.buttonBg,
    marginRight: 8,
  },
  buttonWrapper: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  },
  buttonWrapperEdit: {
    justifyContent: 'space-between',
  },
  actionButtons: {
    display: 'flex',
    gap: 24,
  },
});

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.buttonBg,
    background: theme.searchInputBg,
    borderRadius: 4,
    paddingLeft: 10,
    '&:hover': {
      background: theme.listHover,
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 10,
    },
    '& img': {
      fill: theme.buttonBg,
      marginRight: 10,
    },
  },
}))(Button);
class CreateTag extends React.Component {
  state = {
    error: null,
    tagName: '',
    busy: false,
    openConfirmDialog: false,
    target: {},
    customer: null,
    exporting: false,
    selectedColor: '',
  };

  save = async () => {
    const { tagName, selectedColor } = this.state;
    const { selectedRow, setSelectedRow, actions, setWorkflowTags } =
      this.props;
    const isEdit = !!selectedRow?.id;
    if (isEdit) {
      await actions.updateTag(selectedRow.id, {
        name: tagName,
        color: selectedColor,
      });
    } else {
      await actions.createTag({
        name: tagName,
        color: selectedColor,
      });
    }
    const result = await actions.getTagList('');
    setWorkflowTags(result);
    setSelectedRow(null);
  };

  delete = async () => {
    const { selectedRow, setSelectedRow, actions, setWorkflowTags } =
      this.props;
    await actions.deleteTag(selectedRow.id);
    const result = await actions.getTagList('');
    setWorkflowTags(result);
    setSelectedRow(null);
  };

  render() {
    const { busy, selectedColor, tagName } = this.state;

    const { t, classes, setSelectedRow, selectedRow } = this.props;
    const isEdit = !!selectedRow?.id;
    const colors = [
      'rgba(248, 134, 134, 1)',
      'rgba(248, 203, 134, 1)',
      'rgba(248, 245, 134, 1)',
      'rgba(157, 248, 134, 1)',
      'rgba(134, 248, 248, 1)',
      'rgba(134, 180, 248, 1)',
      'rgba(184, 135, 247, 1)',
      'rgba(248, 134, 203, 1)',
      'rgba(207, 207, 207, 1)',
    ];

    const applyOpacity = (color, opacity) => {
      return color.replace(/[\d\.]+\)$/g, `${opacity})`);
    };

    if (isEdit && !selectedColor && selectedRow?.color) {
      this.setState({ selectedColor: selectedRow.color });
    }

    if (isEdit && !tagName && selectedRow?.name) {
      this.setState({ tagName: selectedRow.name });
    }

    return (
      <>
        <div className={classes.buttonsWrapper}>
          <ColorButton
            variant="contained"
            color="primary"
            disableElevation={true}
            onClick={() => setSelectedRow({})}
          >
            <AddIcon />
            {t('Create')}
          </ColorButton>
        </div>
        <Dialog
          fullWidth={true}
          maxWidth="sm"
          onClose={() => {
            if (!busy) {
              this.setState({ selectedColor: '' });
              setSelectedRow(null);
            }
          }}
          open={!!selectedRow}
        >
          <DialogTitle>{isEdit ? t('EditTag') : t('CreateTag')}</DialogTitle>
          <DialogContent>
            <StringElement
              description={t('TagName')}
              fullWidth={true}
              darkTheme={true}
              required={true}
              disabled={busy}
              variant={'outlined'}
              onChange={(value) => {
                this.setState({ tagName: value });
              }}
              value={tagName || ''}
              maxLength={20}
              className={classNames({
                [classes.formControl]: true,
                [classes.darkThemeLabel]: true,
              })}
            />

            <p>{t('Color')}</p>

            <div className={classes.colorsWrapper}>
              {colors.map((color, index) => (
                <div
                  key={index}
                  className={classes.colorsItem}
                  style={{
                    backgroundColor: applyOpacity(
                      color,
                      selectedColor === color ? 1 : 0.2,
                    ),
                    border: `1px solid ${applyOpacity(
                      color,
                      selectedColor === color ? 1 : 0.4,
                    )}`,
                    color:
                      selectedColor === color
                        ? 'rgba(0, 0, 0, .7)'
                        : 'rgba(255, 255, 255, .7)',
                  }}
                  onClick={() => this.setState({ selectedColor: color })}
                >
                  Tag text here
                </div>
              ))}
            </div>
          </DialogContent>
          <DialogActions>
            {busy ? <CircularProgress size={16} /> : null}
            <div
              className={classNames({
                [classes.buttonWrapper]: true,
                [classes.buttonWrapperEdit]: isEdit,
              })}
            >
              {isEdit ? (
                <Button
                  color="primary"
                  onClick={this.delete}
                  disabled={busy}
                  aria-label={t('Delete')}
                >
                  <DeleteOutlineOutlinedIcon className={classes.deleteIcon} />
                  {t('Delete')}
                </Button>
              ) : null}
              <div className={classes.actionButtons}>
                <Button
                  color="primary"
                  onClick={() => setSelectedRow(null)}
                  disabled={busy}
                  aria-label={t('Cancel')}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={busy}
                  onClick={this.save}
                  aria-label={t('Save')}
                >
                  {t('Save')}
                </Button>
              </div>
            </div>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  actions: {
    createTag: bindActionCreators(createTag, dispatch),
    updateTag: bindActionCreators(updateTag, dispatch),
    deleteTag: bindActionCreators(deleteTag, dispatch),
    getTagList: bindActionCreators(getTagList, dispatch),
  },
});

const styled = withStyles(styles)(CreateTag);
const translated = translate('TagsListPage')(styled);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
