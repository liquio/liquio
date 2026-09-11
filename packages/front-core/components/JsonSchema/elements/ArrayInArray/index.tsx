import React from 'react';
import objectPath from 'object-path';
import { translate, Translate } from 'react-translate';
import { Fade, Divider, IconButton } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { SchemaForm } from 'components/JsonSchema';
import TextBlock from 'components/JsonSchema/elements/TextBlock';
import { JsonSchemaNode } from '../../types';

const styles = () => ({
  content: {
    marginBottom: 20,
  },
  collapseBtnWrapper: {
    marginLeft: -8,
  },
  showMoreIcon: {
    color: '#000',
  },
  expandItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'end',
  },
  infoBlock: {},
  divider: {
    marginTop: 26,
    marginBottom: 26,
  },
  arrayItem: {
    marginBottom: 40,
  },
});

const defaultPopupState = (rootDocument: { data?: Record<string, unknown> } | undefined, stepName: string): unknown =>
  rootDocument &&
  rootDocument.data &&
  (rootDocument.data[stepName] as Record<string, unknown> | undefined) &&
  (rootDocument.data[stepName] as Record<string, unknown>).chosenPopup;

interface ArrayInArrayProps extends WithStyles<typeof styles> {
  t: Translate;
  rootDocument: { data: Record<string, unknown> };
  dataMapping: string;
  htmlBlock?: string;
  hidden?: boolean;
  params?: Record<string, unknown> | null;
  collapseText?: string | null;
  openText?: string | null;
  parentValue?: Record<string, unknown>;
  useParentData?: boolean;
  stepName?: string;
  pure?: boolean;
  dataPath?: string | false;
  togglePopupBlock?: string | false;
  collapsedHtmlBlock?: string | false;
  popupProps?: JsonSchemaNode[] | false;
  actions: { setValues: (data: unknown) => void };
  path: Array<string | number>;
  value?: Array<unknown[]>;
  errors?: unknown;
  alwaysOpen?: boolean;
  [key: string]: unknown;
}

const ArraiInArray = (props: ArrayInArrayProps) => {
  const {
    htmlBlock = '',
    classes,
    params = null,
    hidden = false,
    rootDocument,
    stepName = '',
    dataPath = false,
    actions,
    path,
    value,
    errors,
    popupProps = false,
    togglePopupBlock = false,
    collapsedHtmlBlock = false,
    alwaysOpen,
  } = props;
  const [dynamicData, setDynamicData] = React.useState<Array<Record<string, unknown>>>([]);
  const [chosenPopup, setchosenPopup] = React.useState<Record<number, string>>(
    (defaultPopupState(rootDocument, stepName) as Record<number, string>) || {},
  );
  const [expanded, toggleExpand] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (!dataPath) return;

    const data = objectPath.get(rootDocument.data, dataPath as string);

    if (!data) return;

    if (JSON.stringify(dynamicData) === JSON.stringify(data)) return;

    setDynamicData(data as Array<Record<string, unknown>>);
  });

  if (hidden) return null;

  const getPopupSchema = (index: number): JsonSchemaNode | false => {
    if (!chosenPopup[index]) return false;

    return chosenPopup[index] === 'limited' ? (popupProps as JsonSchemaNode[])[0] : (popupProps as JsonSchemaNode[])[1];
  };

  const toggleCollapseArray = (i: number) => {
    const isExpanded = expanded.includes(i);
    const list = expanded.filter((el) => el !== i);

    if (isExpanded) {
      toggleExpand(list);
    } else {
      expanded.push(i);
      toggleExpand(list.concat([i]));
    }
  };

  const choosePopupType = ({ chosenType, index, rootPath }: { chosenType: string; index: number; rootPath: Array<string | number> }) => {
    const checkboxes = {
      ...chosenPopup,
      [index]: chosenType,
    };

    setchosenPopup(checkboxes);

    objectPath.set(rootDocument.data, stepName + '.chosenPopup', checkboxes);

    objectPath.set(rootDocument.data, rootPath as string[], []);

    actions.setValues(rootDocument.data);
  };

  const replaceEmptyArrayItems = ({ rootPath }: { rootPath: Array<string | number> }) => {
    const arrayPath = rootPath.filter((e, i) => i !== rootPath.length - 1);
    const fullArray = objectPath.get(rootDocument.data, arrayPath as string[]) as unknown[];

    const map = [...fullArray].map((element) => (!element ? [] : element));

    objectPath.set(rootDocument.data, arrayPath as string[], map);

    return rootDocument.data;
  };

  const handleSaveNewPopup = ({ data, index, rootPath }: { data: Record<string, unknown>; index: number; rootPath: Array<string | number> }) => {
    const newData: Record<string, unknown> = {};
    const arrayItem = (value && value[index]) || [];
    const chosenSchema = getPopupSchema(index) as JsonSchemaNode;

    Object.keys(chosenSchema.properties || {}).forEach((name) => {
      newData[name] = data[name];
    });

    (arrayItem as unknown[]).push(newData);

    objectPath.set(rootDocument.data, rootPath as string[], arrayItem);

    actions.setValues(
      replaceEmptyArrayItems({
        rootPath,
      }),
    );
  };

  const handleDeleteItem = ({ data, innerIndex, rootPath }: { data: unknown[]; innerIndex: number; rootPath: Array<string | number> }) => {
    const filtered = data.filter((o, i) => i !== innerIndex);

    objectPath.set(rootDocument.data, rootPath as string[], filtered);

    actions.setValues(rootDocument.data);
  };

  const handleEditPopup = ({ data, innerIndex, rootPath }: { data: unknown; innerIndex: number; rootPath: Array<string | number> }) => {
    objectPath.set(rootDocument.data, rootPath.concat(innerIndex) as string[], data);

    actions.setValues(rootDocument.data);
  };

  if (!dynamicData.length) return null;

  return (
    <ElementContainer
      {...props}
      errors={errors}
      description={null as unknown as string}
      bottomSample={true}
    >
      {dynamicData.map((mainElement, index) => {
        const rootPath = ([stepName] as Array<string | number>)
          .concat(path)
          .filter((p) => p !== null && p !== undefined && p !== '')
          .concat(index);

        const isExpanded = expanded.includes(index);
        const ExpandIcon = isExpanded ? RemoveIcon : AddIcon;

        const chosenSchema = getPopupSchema(index);

        return (
          <div key={index} className={classes.arrayItem}>
            <div className={classes.expandItemRow}>
              <div className={classes.infoBlock}>
                {htmlBlock ? (
                  <TextBlock
                    htmlBlock={htmlBlock}
                    params={params}
                    rootDocument={{
                      data: mainElement,
                    }}
                  />
                ) : null}
              </div>
              {alwaysOpen ? null : (
                <IconButton
                  onClick={() => toggleCollapseArray(index)}
                  size="large"
                >
                  <ExpandIcon className={classes.showMoreIcon} />
                </IconButton>
              )}
            </div>

            {alwaysOpen || isExpanded ? (
              <Fade in={true}>
                <div className={classes.content}>
                  {collapsedHtmlBlock ? (
                    <>
                      <TextBlock
                        htmlBlock={collapsedHtmlBlock}
                        params={params}
                        rootDocument={{
                          data: mainElement,
                        }}
                      />
                    </>
                  ) : null}

                  {togglePopupBlock ? (
                    <>
                      <SchemaForm
                        rootDocument={rootDocument}
                        schema={togglePopupBlock}
                        value={chosenPopup[index]}
                        rowDirection={false}
                        onChange={({ data }: { data: string }) =>
                          choosePopupType({
                            chosenType: data,
                            rootPath,
                            index,
                          })
                        }
                      />
                    </>
                  ) : null}

                  {chosenSchema ? (
                    <>
                      {(((value && value[index]) || []) as Array<Record<string, unknown>>).map(
                        (arrayItemData, innerIndex) => (
                          <SchemaForm
                            key={innerIndex}
                            rootDocument={rootDocument}
                            schema={chosenSchema}
                            htmlBlock={chosenSchema.htmlBlock}
                            params={chosenSchema.params}
                            value={arrayItemData}
                            rootValue={arrayItemData}
                            popupDeleteArrayItem={true}
                            saveLocalDataOnInit={true}
                            handleDeleteCallBack={() =>
                              handleDeleteItem({
                                data: value?.[index] as unknown[],
                                rootPath,
                                innerIndex,
                              })
                            }
                            actions={{
                              ...actions,
                              setValues: (data: unknown) =>
                                handleEditPopup({
                                  data,
                                  rootPath,
                                  innerIndex,
                                }),
                            }}
                          />
                        ),
                      )}

                      {chosenPopup[index] === 'limited' &&
                      (value as unknown[][])[index].length > 0 ? null : (
                        <SchemaForm
                          isAddButton={true}
                          rootDocument={rootDocument}
                          schema={chosenSchema}
                          disableForceSave={true}
                          value={value}
                          actions={{
                            ...actions,
                            setValues: (data: Record<string, unknown>) =>
                              handleSaveNewPopup({
                                data,
                                index,
                                rootPath,
                              }),
                          }}
                        />
                      )}
                    </>
                  ) : null}
                </div>
              </Fade>
            ) : null}
            <Divider className={classes.divider} />
          </div>
        );
      })}
    </ElementContainer>
  );
};

const translated = translate('Elements')(ArraiInArray);
export default withStyles(styles)(translated);
