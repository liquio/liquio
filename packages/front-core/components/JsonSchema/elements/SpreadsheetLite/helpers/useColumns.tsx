/* eslint-disable quotes */
import React, { useMemo } from "react";
import {
  checkboxColumn,
  floatColumn,
  keyColumn,
  textColumn,
} from "react-datasheet-grid";

import SchemaForm from "components/JsonSchema/SchemaForm";
import ChangeEvent from "components/JsonSchema/ChangeEvent";

import capitalizeFirstLetter from "helpers/capitalizeFirstLetter";
import evaluate from "helpers/evaluate";

import { useStyles } from "./useHeaders";

interface PropertySchema {
  type?: string;
  control?: string;
  isDisabled?: string;
  hidden?: string;
  headerAlign?: string;
  description?: string;
  [key: string]: unknown;
}

const useColumns = (
  properties: Record<string, PropertySchema>,
  required: string[] | undefined,
  path: Array<string | number>,
  readOnly: boolean | undefined,
  document: unknown,
) => {
  const classes = useStyles() as unknown as Record<string, string>;

  return useMemo(
    () =>
      Object.keys(properties).map((propertyName) => {
        const property = properties[propertyName];
        let disable: unknown = false;
        let hidden: unknown = false;

        let column: Record<string, unknown> = keyColumn(propertyName, textColumn as never);

        if (property.type === "boolean") {
          column = keyColumn(propertyName, checkboxColumn as never);
        }

        if (property.type === "number") {
          column = keyColumn(propertyName, floatColumn as never);
        }

        if (property.control) {
          column = {
            component: (componentProps: {
              rowData: Record<string, unknown>;
              rowIndex: number;
              focus: boolean;
              setRowData: (rowData: Record<string, unknown>) => void;
            }) => {
              const { rowData, rowIndex, focus, setRowData } = componentProps;
              return (
                <SchemaForm
                  width="100%"
                  path={path.concat(rowIndex, propertyName)}
                  schema={properties[propertyName]}
                  noMargin={true}
                  autoFocus={focus}
                  fullWidth={true}
                  multiline={false}
                  required={(required || []).includes(propertyName)}
                  name={propertyName}
                  readOnly={readOnly}
                  value={rowData[propertyName]}
                  parentValue={rowData}
                  useOwnContainer={true}
                  usedInTable={true}
                  onChange={(changes: unknown) =>
                    setRowData({
                      ...rowData,
                      [propertyName]:
                        changes instanceof ChangeEvent ? changes.data : changes,
                    })
                  }
                />
              );
            },
          };
        }

        if (!!property.isDisabled) {
          disable = evaluate(property.isDisabled, document);
          if (disable instanceof Error) {
            console.error("column isDisabled", property.isDisabled, disable);
            disable = false;
          }
        }

        if (!!property.hidden) {
          hidden = evaluate(property.hidden, document);
          if (hidden instanceof Error) {
            console.error("column hidden", property.hidden, hidden);
            hidden = false;
          }
        }

        return {
          ...properties[propertyName],
          ...column,
          headerClassName: `${classes.cutText} ${
            property.headerAlign
              ? classes[`align${capitalizeFirstLetter(property.headerAlign)}`]
              : ""
          }`,
          title: property.description || propertyName,
          disabled: !!readOnly || disable,
          hidden: hidden,
          propertyName,
        } as Record<string, unknown>;
      }),
    [classes, path, properties, readOnly, required, document],
  );
};

export default useColumns;
