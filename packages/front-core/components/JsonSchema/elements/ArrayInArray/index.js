import React from 'react';
import PropTypes from 'prop-types';
import objectPath from 'object-path';
import { translate } from 'react-translate';
import { Fade, Divider, IconButton } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { SchemaForm } from 'components/JsonSchema';
import TextBlock from 'components/JsonSchema/elements/TextBlock';

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

const defaultPopupState = (rootDocument, stepName) =>
  rootDocument &&
  rootDocument.data &&
  rootDocument.data[stepName] &&
  rootDocument.data[stepName].chosenPopup;

const ArraiInArray = (props) => {
  const {
    htmlBlock,
    classes,
    params,
    hidden,
    rootDocument,
    stepName,
    dataPath,
    actions,
    path,
    value,
    errors,
    popupProps,
    togglePopupBlock,
    collapsedHtmlBlock,
    alwaysOpen,
  } = props;
  const [dynamicData, setDynamicData] = React.useState([]);
  const [chosenPopup, setchosenPopup] = React.useState(
    defaultPopupState(rootDocument, stepName) || {},
  );
  const [expanded, toggleExpand] = React.useState([]);

  React.useEffect(() => {
    if (!dataPath) return;

    const data = objectPath.get(rootDocument.data, dataPath);

    if (!data) return;

    if (JSON.stringify(dynamicData) === JSON.stringify(data)) return;

    setDynamicData(data);
  });

  if (hidden) return null;

  const getPopupSchema = (index) => {
    if (!chosenPopup[index]) return false;

    return chosenPopup[index] === 'limited' ? popupProps[0] : popupProps[1];
  };

  const toggleCollapseArray = (i) => {
    const isExpanded = expanded.includes(i);
    const list = expanded.filter((el) => el !== i);

    if (isExpanded) {
      toggleExpand(list);
    } else {
      expanded.push(i);
      toggleExpand(list.concat([i]));
    }
  };

  const choosePopupType = ({ chosenType, index, rootPath }) => {
    const checkboxes = {
      ...chosenPopup,
      [index]: chosenType,
    };

    setchosenPopup(checkboxes);

    objectPath.set(rootDocument.data, stepName + '.chosenPopup', checkboxes);

    objectPath.set(rootDocument.data, rootPath, []);

    actions.setValues(rootDocument.data);
  };

  const replaceEmptyArrayItems = ({ rootPath }) => {
    const arrayPath = rootPath.filter((e, i) => i !== rootPath.length - 1);
    const fullArray = objectPath.get(rootDocument.data, arrayPath);

    const map = [...fullArray].map((element) => (!element ? [] : element));

    objectPath.set(rootDocument.data, arrayPath, map);

    return rootDocument.data;
  };

  const handleSaveNewPopup = ({ data, index, rootPath }) => {
    const newData = {};
    const arrayItem = (value && value[index]) || [];
    const chosenSchema = getPopupSchema(index);

    Object.keys(chosenSchema.properties).forEach((name) => {
      newData[name] = data[name];
    });

    arrayItem.push(newData);

    objectPath.set(rootDocument.data, rootPath, arrayItem);

    actions.setValues(
      replaceEmptyArrayItems({
        rootPath,
      }),
    );
  };

  const handleDeleteItem = ({ data, innerIndex, rootPath }) => {
    const filtered = data.filter((o, i) => i !== innerIndex);

    objectPath.set(rootDocument.data, rootPath, filtered);

    actions.setValues(rootDocument.data);
  };

  const handleEditPopup = ({ data, innerIndex, rootPath }) => {
    objectPath.set(rootDocument.data, rootPath.concat(innerIndex), data);

    actions.setValues(rootDocument.data);
  };

  if (!dynamicData.length) return null;

  return (
    <ElementContainer
      {...props}
      errors={errors}
      description={null}
      bottomSample={true}
    >
      {dynamicData.map((mainElement, index) => {
        const rootPath = [stepName]
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
                        onChange={({ data }) =>
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
                      {((value && value[index]) || []).map(
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
                                data: value[index],
                                rootPath,
                                innerIndex,
                              })
                            }
                            actions={{
                              ...actions,
                              setValues: (data) =>
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
                      value[index].length > 0 ? null : (
                        <SchemaForm
                          isAddButton={true}
                          rootDocument={rootDocument}
                          schema={chosenSchema}
                          disableForceSave={true}
                          value={value}
                          actions={{
                            ...actions,
                            setValues: (data) =>
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

ArraiInArray.propTypes = {
  t: PropTypes.func.isRequired,
  classes: PropTypes.object.isRequired,
  rootDocument: PropTypes.object.isRequired,
  dataMapping: PropTypes.string.isRequired,
  htmlBlock: PropTypes.string,
  hidden: PropTypes.bool,
  params: PropTypes.object,
  collapseText: PropTypes.string,
  openText: PropTypes.string,
  parentValue: PropTypes.object,
  useParentData: PropTypes.bool,
  stepName: PropTypes.string,
  pure: PropTypes.bool,
  dataPath: PropTypes.array,
  togglePopupBlock: PropTypes.string,
  collapsedHtmlBlock: PropTypes.string,
  popupProps: PropTypes.object,
};

ArraiInArray.defaultProps = {
  htmlBlock: '',
  hidden: false,
  params: null,
  collapseText: null,
  openText: null,
  parentValue: {},
  stepName: '',
  useParentData: false,
  pure: false,
  dataPath: false,
  togglePopupBlock: false,
  collapsedHtmlBlock: false,
  popupProps: false,
};

const translated = translate('Elements')(ArraiInArray);
export default withStyles(styles)(translated);
