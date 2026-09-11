/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import ChipTabsUntyped from 'components/ChipTabs';
import evaluate from 'helpers/evaluate';
import { Grid } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import { Theme } from '@mui/material/styles';
import classNames from 'classnames';
import SchemaForm from '../SchemaForm';

const ChipTabs = ChipTabsUntyped as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: Theme) => ({
  tabs: {
    margin: 0,
  },
  tabColLeft: {
    [theme.breakpoints.down('lg')]: {
      order: '0 !important',
    },
  },
  tabColRight: {
    [theme.breakpoints.down('lg')]: {
      order: '1 !important',
    },
  },
  tabsContainer: {
    marginTop: 16,
  },
  scrollButtons: {
    width: 'auto',
  },
  chips: {
    margin: '0 15px 15px 0',
  },
  error: {
    color: '#ff0000',
  },
  outlined: {
    // border: '2px solid #000',
    // borderRadius: 50
  },
});

interface TabProperty {
  hidden?: boolean | string;
  description?: string;
  readOnly?: boolean;
  [key: string]: unknown;
}

interface TabsControlProps extends WithStyles<typeof styles> {
  properties?: Record<string, TabProperty>;
  errors: Array<{ path: string; [key: string]: unknown }>;
  value?: Record<string, unknown> | null;
  parentValue?: Record<string, unknown>;
  path: Array<string | number>;
  onChange: (arg1: unknown, arg2?: unknown) => void;
  emptyHidden?: boolean;
  hidden?: boolean;
  stepName: string;
  rootDocument: { data: Record<string, unknown> };
  variant?: string;
  readOnly?: boolean;
  options?: {
    orientation?: string;
    position?: string;
    columnLeft?: Record<string, unknown>;
    columnRight?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

class TabsControl extends React.Component<TabsControlProps> {
  static defaultProps = {
    properties: {},
    errors: [],
    value: null,
    path: [],
    onChange: () => null,
    emptyHidden: true,
    hidden: false,
    rootDocument: {},
    variant: 'default',
  };

  componentDidMount = () => this.init();

  componentDidUpdate = ({ path, activeStep }: TabsControlProps) => {
    const {
      path: newPath,
      activeStep: newActiveStep,
      hidden,
      value,
    } = this.props;

    if (path.join() !== newPath.join() || newActiveStep !== activeStep) {
      this.init();
    }

    if (!hidden && !value) {
      this.init();
    }
  };

  init = () => {
    const { value, onChange, hidden, properties = {} } = this.props;

    if (hidden && value && Object.keys(value).length) {
      onChange(null);
    }

    if (properties && (!value || !value.active) && !hidden) {
      const tabs = Object.keys(properties).filter(this.isTabHidden);
      onChange.bind(null, 'active')(tabs[0]);
    }
  };

  handleChange = (event: unknown, activeTab: number) => {
    const { onChange, properties = {}, emptyHidden, value } = this.props;

    const tabs = Object.keys(properties).filter(this.isTabHidden);

    if (emptyHidden) {
      onChange && onChange({ active: tabs[activeTab] });
    } else {
      onChange &&
        onChange({
          ...(value || {}),
          active: tabs[activeTab],
        });
    }
  };

  isTabHidden = (tabName: string) => {
    const { properties = {}, rootDocument, value } = this.props;
    const { hidden } = properties[tabName];

    if (!hidden) {
      return true;
    }

    if (typeof hidden === 'string') {
      const result = evaluate(
        hidden,
        rootDocument.data,
        (value || {})[tabName],
        value || {},
      );

      if (result instanceof Error) {
        (result as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'schema form isHidden', rootDocument });
        return false;
      }

      return result !== true;
    }

    return !hidden;
  };

  render() {
    const {
      classes,
      properties = {},
      readOnly,
      value = {},
      parentValue = {},
      onChange,
      path,
      hidden,
      errors,
      options = {},
      variant,
      ...rest
    } = this.props;

    const { orientation, position, columnLeft, columnRight } = options;
    const tabs = Object.keys(properties).filter(this.isTabHidden);

    if (hidden || !tabs.length) return null;

    const activeTab = tabs.indexOf((value && value.active as string) || tabs[0]);

    const tabKey = tabs[activeTab];
    const activeSchema =
      properties[value?.active as string] || Object.values(properties)[activeTab];

    const erroredTabs = tabs
      .map((tabName, index) => {
        const tabPath = path.concat(tabName).join('.');
        return errors.some((error) => error.path.indexOf(tabPath) === 0)
          ? index
          : false;
      })
      .filter(Boolean);

    const chipTabs = (
      <ChipTabs
        errored={erroredTabs}
        activeIndex={activeTab}
        variant={variant}
        onChange={this.handleChange}
        tabs={tabs.map((key) => ({
          title: properties[key].description,
        }))}
        readOnly={readOnly}
        orientation={orientation}
        position={position}
        className={classNames({
          [classes.chips]: true,
          [classes.outlined]: variant === 'outlined',
        })}
      />
    );

    const schemaForm = activeSchema ? (
      <SchemaForm
        {...(rest as unknown as Record<string, unknown>)}
        errors={errors}
        schema={{ ...activeSchema, description: '' }}
        path={path.concat(tabKey)}
        readOnly={readOnly || activeSchema.readOnly}
        value={(value || {})[tabKey]}
        onChange={onChange.bind(null, tabKey)}
        parentValue={parentValue}
      />
    ) : null;

    return (
      <>
        {orientation && position ? (
          <Grid className={classes.tabsContainer} container={true} spacing={4}>
            <Grid
              className={classes.tabColLeft}
              item={true}
              xs={12}
              style={{
                order: 1,
              }}
              {...columnLeft}
            >
              {chipTabs}
            </Grid>
            <Grid
              className={classes.tabColRight}
              item={true}
              xs={12}
              style={{
                order: position === 'left' ? 2 : 0,
              }}
              {...columnRight}
            >
              {schemaForm}
            </Grid>
          </Grid>
        ) : (
          <>
            {chipTabs}
            {schemaForm}
          </>
        )}
      </>
    );
  }
}

export default withStyles(styles)(TabsControl);
