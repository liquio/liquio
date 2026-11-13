import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import SelectRaw from 'components/JsonSchema/elements/Select';
import { requestWorkflowCategories } from 'application/actions/workflow';

interface WorkflowCategory {
  id: string;
  [key: string]: unknown;
}

interface WorkflowCategorySelectProps {
  t: (key: string) => string;
  categories?: WorkflowCategory[] | null;
  value?: string;
  onChange?: (value: string) => void;
  actions: {
    requestWorkflowCategories: (options: Record<string, unknown>) => Promise<unknown>;
  };
}

const WorkflowCategorySelect = ({
  t,
  categories = null,
  value,
  onChange = () => null,
  actions,
}: WorkflowCategorySelectProps) => {
  // Read at call time rather than module scope, as a defensive precaution:
  // `components/JsonSchema` is part of a confirmed circular-import chain
  // elsewhere in the app (see TYPESCRIPT.md's CodeEditDialog batch notes),
  // so any of its exports are deferred here even though this specific leaf
  // import isn't known to close a cycle.
  const Select = SelectRaw as unknown as React.ComponentType<Record<string, unknown>>;

  React.useEffect(() => {
    if (!categories) {
      actions.requestWorkflowCategories({
        count: 1000,
      });
    }
  }, [actions, categories]);

  const handleSelect = (chosen: string) => onChange(chosen);

  const selected = (categories || []).find(({ id }) => id === value)?.id;

  return (
    <Select
      options={categories || []}
      description={t('WorkflowCategory')}
      darkTheme={true}
      variant={'outlined'}
      value={selected}
      onChange={handleSelect}
    />
  );
};

interface ConnectedState {
  workflow: { categories: WorkflowCategory[] | null };
}

const mapStateToProps = ({ workflow: { categories } }: ConnectedState) => ({ categories });

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestWorkflowCategories: bindActionCreators(
      requestWorkflowCategories,
      dispatch,
    ),
  },
});

const translated = translate('WorkflowAdminPage')(WorkflowCategorySelect as never);

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
