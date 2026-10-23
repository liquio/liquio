import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import SortableTree from 'react-sortable-tree';
import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import {
  requestWorkflowCategories,
  updateWorkflowCategory,
  createWorkflowCategory,
  deleteWorkflowCategory,
} from 'application/actions/workflow';
import 'react-sortable-tree/style.css';
import arrayToTree from 'array-to-tree';
import {
  Toolbar,
  Button,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import StringElement from 'components/JsonSchema/elements/StringElement';
import ProgressLine from 'components/Preloader/ProgressLine';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import MenuIcon from '@mui/icons-material/Menu';
import checkAccess from 'helpers/checkAccess';

interface Category {
  id: string;
  name: string;
  parentId?: string | number | null;
  children?: Category[];
  [key: string]: unknown;
}

const categoryTree = (list: Category[], firstLevelId: string | number | null = null) =>
  arrayToTree(
    list.map((item) => ({
      ...item,
      title: item.name,
      expanded: true,
      parentId: item.parentId === firstLevelId ? 0 : item.parentId,
    })),
    {
      customID: 'id',
      parentProperty: 'parentId',
      childrenProperty: 'children',
    },
  );

const styles = {
  toolbar: {
    marginTop: 12,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'baseline',
  },
  container: {
    height: 'calc(100% - 48px)',
  },
  createButton: {
    marginLeft: 20,
  },
};

interface WorkflowCategoryListPageProps extends ModulePageProps {
  classes: Record<string, string>;
  categories?: Category[];
  userInfo: Record<string, unknown>;
  userUnits: unknown[];
  loading?: boolean;
  location: unknown;
  actions: {
    requestWorkflowCategories: () => Promise<Category[] | Error>;
    createWorkflowCategory: (data: { name: string }) => Promise<Category>;
    updateWorkflowCategory: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deleteWorkflowCategory: (id: string) => Promise<unknown>;
  };
}

interface WorkflowCategoryListPageState {
  treeData: unknown[];
  newCategoryName: string;
  error: Error | null;
  showErrorDialog: boolean;
  open: boolean;
  anchorEl: Element | null;
  userInput: string;
  activeItem: Category | Record<string, unknown>;
  loading: boolean;
  errorEmpty: { message: string } | null;
}

class WorkflowCategoryListPage extends ModulePage<WorkflowCategoryListPageProps> {
  state: WorkflowCategoryListPageState;

  constructor(props: WorkflowCategoryListPageProps) {
    super(props);
    this.state = {
      treeData: [],
      newCategoryName: '',
      error: null,
      showErrorDialog: false,
      open: false,
      anchorEl: null,
      userInput: '',
      activeItem: {},
      loading: false,
      errorEmpty: null,
    };
  }

  async componentDidMount() {
    const { actions } = this.props;

    const categories =
      this.props.categories || (await actions.requestWorkflowCategories());

    if (categories instanceof Error) {
      this.setState({ error: categories });
      return;
    }

    const treeData = categoryTree(categories || []);
    this.setState({ treeData });
  }

  handleCreateCategory = async () => {
    const { actions, t } = this.props;
    const { newCategoryName, treeData } = this.state;

    this.setState({ errorEmpty: null });

    if (!newCategoryName.length) {
      this.setState({ errorEmpty: { message: t?.('RequiredField') as string } });
      return;
    }

    this.setState({ newCategoryName: '' });

    const newCategory = await actions.createWorkflowCategory({
      name: newCategoryName,
    });

    this.setState({
      treeData: categoryTree([newCategory]).concat(treeData as never),
    });
  };

  updateChild = (item: Category, parentId: string | number = 0): Category => {
    const { actions } = this.props;
    if (item.parentId !== parentId) {
      actions.updateWorkflowCategory(item.id, { ...item, parentId });
    }

    return {
      ...item,
      parentId,
      children: item.children
        ? item.children.map((child) => this.updateChild(child, item.id))
        : undefined,
    };
  };

  handleChange = (treeData: Category[]) => {
    this.setState({
      treeData: treeData.map((child) => this.updateChild(child)),
    });
  };

  handleDelete = async () => {
    const { categories, actions } = this.props;
    const {
      activeItem: { id },
    } = this.state as { activeItem: Category };

    this.handleMenuClose();

    const result = await actions.deleteWorkflowCategory(id);

    if (result instanceof Error) {
      this.setState({ error: result, showErrorDialog: true });
      return;
    }

    this.setState({
      treeData: categoryTree(
        (categories || []).filter((category) => category.id !== id),
      ),
    });
  };

  toggleChangeName = (open: boolean) => {
    this.setState({ open });
    this.handleMenuClose();
  };

  handleChangeName = (userInput: string) => this.setState({ userInput });

  handleSaveChangeName = async () => {
    const { actions, t } = this.props;
    const {
      activeItem,
      activeItem: { id },
      userInput,
    } = this.state as { activeItem: Category; userInput: string };

    if (!activeItem) return;

    if (!userInput.length) {
      this.setState({ errorEmpty: { message: t?.('RequiredField') as string } });
      return;
    }

    this.setState({ loading: true, errorEmpty: null });

    await actions.updateWorkflowCategory(id, {
      activeItem,
      name: userInput,
    });

    const categories = await actions.requestWorkflowCategories();
    const treeData = categoryTree((categories as Category[]) || []);

    this.setState({
      treeData,
      open: false,
      loading: false,
    });
  };

  handleMenuOpen = ({ currentTarget }: React.MouseEvent, activeItem: Category) => {
    this.setState({
      anchorEl: currentTarget,
      activeItem,
      userInput: activeItem.name,
      errorEmpty: null,
    });
  };

  handleMenuClose = () => this.setState({ anchorEl: null });

  renderContent = () => {
    const { t, classes, userInfo, userUnits } = this.props;

    const {
      treeData,
      newCategoryName,
      error,
      showErrorDialog,
      open,
      anchorEl,
      userInput,
      loading,
      errorEmpty,
    } = this.state;

    const isEditable = checkAccess(
      { userHasUnit: [1000002] },
      userInfo,
      userUnits as never,
    );

    return (
      <>
        {showErrorDialog && error ? (
          <Dialog
            open={true}
            onClose={() => this.setState({ showErrorDialog: false })}
          >
            <DialogTitle>{t?.('ErrorWhileDeletingCategory')}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {t?.('CategoryDeletingErrorMessage')}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => this.setState({ showErrorDialog: false })}
                color="primary"
                autoFocus={true}
              >
                {t?.('CloseErrorDialog')}
              </Button>
            </DialogActions>
          </Dialog>
        ) : null}

        {isEditable && (
          <Toolbar className={classes.toolbar}>
            <StringElement
              required={true}
              noMargin={true}
              value={newCategoryName}
              onChange={(value: string) => this.setState({ newCategoryName: value })}
              maxLength={120}
              // here
              placeholder={t?.('Name')}
              darkTheme={true}
              variant={'outlined'}
              error={errorEmpty}
            />

            <Button
              variant="contained"
              color="primary"
              onClick={this.handleCreateCategory}
              className={classes.createButton}
            >
              {t?.('CreateCategory')}
            </Button>
          </Toolbar>
        )}

        <div className={classes.container}>
          <SortableTree
            treeData={treeData as never}
            onChange={!isEditable ? () => {} : (this.handleChange as never)}
            isVirtualized={true}
            generateNodeProps={(rowInfo: { node: Category }) => ({
              buttons: [
                <>
                  {isEditable && (
                    <IconButton
                      onClick={(event) =>
                        this.handleMenuOpen(event, rowInfo.node)
                      }
                      size="large"
                    >
                      <MenuIcon />
                    </IconButton>
                  )}
                </>,
              ],
            })}
          />
        </div>

        <Menu
          anchorEl={anchorEl}
          open={!!anchorEl}
          onClose={this.handleMenuClose}
          keepMounted={true}
        >
          <MenuItem onClick={() => this.toggleChangeName(true)}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText primary={t?.('EditCategory')} />
          </MenuItem>
          <MenuItem onClick={this.handleDelete}>
            <ListItemIcon>
              <CloseIcon />
            </ListItemIcon>
            <ListItemText primary={t?.('DeleteCategory')} />
          </MenuItem>
        </Menu>

        <Dialog
          open={open}
          fullWidth={true}
          maxWidth="sm"
          onClose={() => this.toggleChangeName(false)}
        >
          <DialogTitle>{t?.('ChangeCategoryNameTitle')}</DialogTitle>
          <DialogContent>
            <StringElement
              description={t?.('Name')}
              fullWidth={true}
              required={true}
              value={userInput}
              onChange={this.handleChangeName}
              error={errorEmpty}
              maxLength={255}
              darkTheme={true}
              variant={'outlined'}
            />
            <ProgressLine loading={loading} />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => this.toggleChangeName(false)}
              color="primary"
            >
              {t?.('CloseErrorDialog')}
            </Button>
            <Button
              onClick={this.handleSaveChangeName}
              variant="contained"
              color="primary"
            >
              {t?.('Save')}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  render = () => {
    const { t, title, loading, location } = this.props;

    return (
      <LeftSidebarLayout
        location={location}
        title={t?.(title as string)}
        loading={loading}
        flexContent={true}
      >
        {this.renderContent()}
      </LeftSidebarLayout>
    );
  };
}

const mapStateToProps = ({
  auth: { info, userUnits },
  workflow: { categories },
}: {
  auth: { info: Record<string, unknown>; userUnits: unknown[] };
  workflow: { categories: Category[] };
}) => ({
  categories,
  userInfo: info,
  userUnits,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    deleteWorkflowCategory: bindActionCreators(
      deleteWorkflowCategory,
      dispatch,
    ),
    createWorkflowCategory: bindActionCreators(
      createWorkflowCategory,
      dispatch,
    ),
    updateWorkflowCategory: bindActionCreators(
      updateWorkflowCategory,
      dispatch,
    ),
    requestWorkflowCategories: bindActionCreators(
      requestWorkflowCategories,
      dispatch,
    ),
  },
});

const styled = withStyles(styles)(WorkflowCategoryListPage as never);
const translated = translate('WorkflowCategoryListPage')(styled as never);
export default connect(mapStateToProps as never, mapDispatchToProps)(translated as never);
