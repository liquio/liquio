import React from 'react';

const StringElement = React.lazy(() =>
  import('components/JsonSchema/elements/StringElement'),
);
const RadioGroup = React.lazy(() =>
  import('components/JsonSchema/elements/RadioGroup/RadioGroup'),
);
const CheckboxGroup = React.lazy(() =>
  import('components/JsonSchema/elements/CheckboxGroup/index'),
);
const ContactConfirmation = React.lazy(() =>
  import('components/JsonSchema/elements/ContactConfirmation'),
);
const SelectUser = React.lazy(() =>
  import('components/JsonSchema/elements/SelectUser'),
);
const Textarea = React.lazy(() =>
  import('components/JsonSchema/elements/Textarea'),
);
const Date = React.lazy(() => import('components/JsonSchema/elements/Date'));
const Toggle = React.lazy(() =>
  import('components/JsonSchema/elements/Toggle'),
);
const SelectFiles = React.lazy(() =>
  import('components/JsonSchema/elements/SelectFiles/index'),
);
const ObjectElement = React.lazy(() =>
  import('components/JsonSchema/elements/ObjectElement'),
);
const ArrayElement = React.lazy(() =>
  import('components/JsonSchema/elements/ArrayElement'),
);
const IntegerElement = React.lazy(() =>
  import('components/JsonSchema/elements/IntegerElement'),
);
const NumberElement = React.lazy(() =>
  import('components/JsonSchema/elements/NumberElement'),
);
const BooleanElement = React.lazy(() =>
  import('components/JsonSchema/elements/BooleanElement'),
);
const PreviewDocument = React.lazy(() =>
  import('components/JsonSchema/elements/PreviewDocument'),
);
const FormGroup = React.lazy(() =>
  import('components/JsonSchema/elements/FormGroup'),
);
const Register = React.lazy(() =>
  import('components/JsonSchema/elements/Register'),
);
const RegisterSelect = React.lazy(() =>
  import('components/JsonSchema/elements/Register/RegisterSelect'),
);
const ExternalRegister = React.lazy(() =>
  import('components/JsonSchema/elements/Register/ExternalRegister'),
);
const SignerList = React.lazy(() =>
  import('components/JsonSchema/elements/SignerList'),
);
const TextBlock = React.lazy(() =>
  import('components/JsonSchema/elements/TextBlock'),
);
const TreeSelect = React.lazy(() =>
  import('components/JsonSchema/elements/TreeSelect'),
);
const Table = React.lazy(() => import('components/JsonSchema/elements/Table'));
const RelatedSelects = React.lazy(() =>
  import('components/JsonSchema/elements/RelatedSelects'),
);
const File = React.lazy(() => import('components/JsonSchema/elements/File'));
const DynamicCheckboxGroup = React.lazy(() =>
  import('components/JsonSchema/elements/DynamicCheckboxGroup/index'),
);
const DynamicRadioGroup = React.lazy(() =>
  import('components/JsonSchema/elements/DynamicRadioGroup/index'),
);
const DynamicFilePreview = React.lazy(() =>
  import('components/JsonSchema/elements/DynamicFilePreview/index'),
);
const CalculateButton = React.lazy(() =>
  import('components/JsonSchema/elements/CalculateButton'),
);
const Tabs = React.lazy(() => import('components/JsonSchema/elements/Tabs'));
const TabsOld = React.lazy(() =>
  import('components/JsonSchema/elements/TabsOld'),
);
const ExpansionPanels = React.lazy(() =>
  import('components/JsonSchema/elements/ExpansionPanels'),
);
const DirectPreview = React.lazy(() =>
  import('components/JsonSchema/elements/DirectPreview'),
);
const RegisterForm = React.lazy(() =>
  import('components/JsonSchema/elements/RegisterForm'),
);
const UserList = React.lazy(() =>
  import('components/JsonSchema/elements/UserList'),
);
const Select = React.lazy(() =>
  import('components/JsonSchema/elements/Select'),
);
const UnitSelect = React.lazy(() =>
  import('components/JsonSchema/elements/UnitSelect'),
);
const RegisterTable = React.lazy(() =>
  import('components/JsonSchema/elements/RegisterTable'),
);
const CustomDataSelect = React.lazy(() =>
  import('components/JsonSchema/elements/CustomDataSelect'),
);
const Payment = React.lazy(() =>
  import('components/JsonSchema/elements/Payment/index'),
);
const Popup = React.lazy(() =>
  import('components/JsonSchema/elements/Popup/index'),
);
const Modal = React.lazy(() =>
  import('components/JsonSchema/elements/Modal/index'),
);
const Divider = React.lazy(() =>
  import('components/JsonSchema/elements/Divider'),
);
const RegistrySearch = React.lazy(() =>
  import('components/JsonSchema/elements/RegistrySearch'),
);
const Spreadsheet = React.lazy(() =>
  import('components/JsonSchema/elements/Spreadsheet'),
);
const CurrencyInput = React.lazy(() =>
  import('components/JsonSchema/elements/CurrencyInput'),
);
const CabinetFile = React.lazy(() =>
  import('components/JsonSchema/elements/CabinetFile/index'),
);
const PaymentWidget = React.lazy(() =>
  import('components/JsonSchema/elements/PaymentWidget'),
);
const PaymentWidgetNew = React.lazy(() =>
  import('components/JsonSchema/elements/PaymentWidget'),
);
const DetailsCollapse = React.lazy(() =>
  import('components/JsonSchema/elements/DetailsCollapse'),
);
const Tooltip = React.lazy(() =>
  import('components/JsonSchema/elements/Tooltip'),
);
const DataMap = React.lazy(() =>
  import('components/JsonSchema/elements/DataMap'),
);
const Calculator = React.lazy(() =>
  import('components/JsonSchema/elements/Calculator'),
);
const DynamicSelect = React.lazy(() =>
  import('components/JsonSchema/elements/DynamicSelect/index'),
);
const Address = React.lazy(() =>
  import('components/JsonSchema/elements/Address'),
);
const PreviewDocumentDirect = React.lazy(() =>
  import('components/JsonSchema/elements/PreviewDocumentDirect'),
);
const PropertyList = React.lazy(() =>
  import('components/JsonSchema/elements/PropertyList'),
);
const CustomApiData = React.lazy(() =>
  import('components/JsonSchema/elements/CustomApiData'),
);
const ArrayInArray = React.lazy(() =>
  import('components/JsonSchema/elements/ArrayInArray'),
);
const Registerlink = React.lazy(() =>
  import('components/JsonSchema/elements/Registerlink'),
);
const Card = React.lazy(() => import('components/JsonSchema/elements/Card'));
const DataTable = React.lazy(() =>
  import('components/JsonSchema/elements/DataTable'),
);
const Phone = React.lazy(() => import('components/JsonSchema/elements/Phone'));
const CardBlock = React.lazy(() =>
  import('components/JsonSchema/elements/CardBlock'),
);
const GridItem = React.lazy(() =>
  import('components/JsonSchema/elements/GridItem'),
);
const TimeSlots = React.lazy(() =>
  import('components/JsonSchema/elements/TimeSlots'),
);
const TableData = React.lazy(() =>
  import('components/JsonSchema/elements/TableData'),
);
const RegisterList = React.lazy(() =>
  import('components/JsonSchema/elements/RegisterList'),
);
const Portal = React.lazy(() =>
  import('components/JsonSchema/elements/Portal'),
);
const SpreadsheetLite = React.lazy(() =>
  import('components/JsonSchema/elements/SpreadsheetLite'),
);
const BankQuestionnaire = React.lazy(() =>
  import('components/JsonSchema/elements/BankQuestionnaire'),
);
// const Verifieduserinfo = React.lazy(() =>
//   import("components/JsonSchema/elements/VerifiedUserInfo"),
// );
const EventsCalendar = React.lazy(() =>
  import('components/JsonSchema/elements/EventsCalendar'),
);
const GeojsonMap = React.lazy(() =>
  import('components/JsonSchema/elements/GeojsonMap'),
);
const ExternalReaderRegisterFilePreview = React.lazy(() =>
  import('components/JsonSchema/elements/ExternalReaderRegisterFilePreview'),
);
const ScheduleCalendar = React.lazy(() =>
  import('components/JsonSchema/elements/ScheduleCalendar'),
);
const Map = React.lazy(() => import('components/JsonSchema/elements/Map'));
const UserSelect = React.lazy(() =>
  import('components/JsonSchema/elements/UserSelect'),
);
const DocumentSharing = React.lazy(() =>
  import('components/JsonSchema/elements/DocumentSharing'),
);
const DocumentSharingV2 = React.lazy(() =>
  import('components/JsonSchema/elements/DocumentSharingV2'),
);
const ProtectedFile = React.lazy(() =>
  import('components/JsonSchema/elements/ProtectedFile'),
);
const StripeKYC = React.lazy(() =>
  import('components/JsonSchema/elements/StripeKYC'),
);
const ExternalFileSignerWidget = React.lazy(() =>
  import('components/JsonSchema/elements/Dropbox'),
);
const DiffTable = React.lazy(() =>
  import('components/JsonSchema/elements/DiffTable'),
);
const PdfBlock = React.lazy(() =>
  import('components/JsonSchema/elements/PdfBlock'),
);

export default {
  SelectUser,
  Textarea,
  Date,
  Toggle,
  PreviewDocument,
  SelectFiles,
  ObjectElement,
  ArrayElement,
  StringElement,
  IntegerElement,
  NumberElement,
  BooleanElement,
  FormGroup,
  Register,
  RegisterSelect,
  SignerList,
  CheckboxGroup,
  RadioGroup,
  TextBlock,
  TreeSelect,
  Table,
  RelatedSelects,
  File,
  DynamicCheckboxGroup,
  DynamicRadioGroup,
  DynamicFilePreview,
  CalculateButton,
  Tabs,
  TabsOld,
  ExpansionPanels,
  DirectPreview,
  RegisterForm,
  UserList,
  Select,
  UnitSelect,
  RegisterTable,
  CustomDataSelect,
  Payment,
  ContactConfirmation,
  Popup,
  Modal,
  Divider,
  RegistrySearch,
  Spreadsheet,
  CurrencyInput,
  CabinetFile,
  PaymentWidget,
  PaymentWidgetNew,
  DetailsCollapse,
  Tooltip,
  DataMap,
  Calculator,
  DynamicSelect,
  Address,
  PreviewDocumentDirect,
  PropertyList,
  ExternalRegister,
  CustomApiData,
  ArrayInArray,
  Registerlink,
  Card,
  DataTable,
  Phone,
  CardBlock,
  GridItem,
  TimeSlots,
  TableData,
  RegisterList,
  Portal,
  SpreadsheetLite,
  BankQuestionnaire,
  // Verifieduserinfo,
  EventsCalendar,
  GeojsonMap,
  ExternalReaderRegisterFilePreview,
  ScheduleCalendar,
  Map,
  UserSelect,
  DocumentSharing,
  DocumentSharingV2,
  ProtectedFile,
  StripeKYC,
  ExternalFileSignerWidget,
  DiffTable,
  PdfBlock,
};
