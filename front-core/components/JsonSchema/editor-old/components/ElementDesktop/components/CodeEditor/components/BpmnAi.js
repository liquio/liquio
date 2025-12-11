import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { makeStyles } from '@mui/styles';
import withStyles from '@mui/styles/withStyles';
import classNames from 'classnames';
import hotkeys from 'hotkeys-js';
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDispatch } from 'react-redux';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslate } from 'react-translate';
import remarkGfm from 'remark-gfm';
import sanitizeHtml from 'sanitize-html';

import {
  deleteAssistantChatHistory,
  deleteCodeGenerationChatHistory,
  getAiBuilderHistory,
  getAiChatHistory,
  getAiPrompts,
  getBuilderSessionId,
  getGreetingMessage,
  getHotActionPrompts,
  sendAiAnomaliesAnalyze,
  sendExternalCommand
} from 'actions/bpmnAi';
import { ReactComponent as BuilderStepOneIcon } from 'assets/icons/AI_builder_step_1_icon.svg';
import { ReactComponent as BuilderStepTwoIcon } from 'assets/icons/AI_builder_step_2_icon.svg';
import { ReactComponent as BuilderStepThreeIcon } from 'assets/icons/AI_builder_step_3_icon.svg';
import { ReactComponent as AssistantIcon } from 'assets/icons/assistant_icon.svg';
import { ReactComponent as BuilderIcon } from 'assets/icons/builder_icon.svg';
import { ReactComponent as ChosenInteractiveOptionBuilderIcon } from 'assets/icons/chosen_interactive_option_builder_icon.svg';
import { ReactComponent as CloseIcon } from 'assets/icons/close_icon.svg';
import { ReactComponent as LiquioIntelLogo } from 'assets/icons/liquio_intel_logo.svg';
import { ReactComponent as LiquioIntelLogoWhiteSvg } from 'assets/icons/liquio_intel_logo_white.svg';
import CopySvgIcon from 'assets/img/copy.svg';
import { ReactComponent as DeleteIcon } from 'assets/img/delete_icon.svg';
import ProgressLine from 'components/Preloader/ProgressLine';
import renderHTML from 'helpers/renderHTML';
import RenderOneLine from 'helpers/renderOneLine';
import { useAuth } from 'hooks/useAuth';
import { getConfig } from 'helpers/configLoader';

const MAX_ROWS_SEARCH_FIELD = 4;
const HOTKEY_OPEN_BPMN_AI = 'ctrl+l';

const allowedAttributes = ['id', 'colspan', 'rowspan', 'cellpadding', 'cellspacing'];
const allowedTags = [
  'b',
  'i',
  'em',
  'div',
  'p',
  'span',
  'ul',
  'ol',
  'li',
  'table',
  'tbody',
  'td',
  'tr',
  'br',
  'sup',
  'th',
  'colgroup',
  'col',
  'mark',
  'details'
];

const options = {
  allowedTags,
  allowedAttributes: {},
  selfClosing: ['br', 'hr']
};

allowedTags.forEach((tag) => {
  options.allowedAttributes[tag] = allowedAttributes;
});

const useStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 1000,
    padding: 0
  },
  tabsRoot: {
    backgroundColor: '#383c47',
    color: '#fff',
    marginBottom: 0,
    marginLeft: 18,
    marginRight: 20
  },
  tabsIndicator: {
    backgroundColor: '#FFA98F'
  },
  tabRoot: {
    minHeight: 60,
    color: '#fff',
    marginRight: 0,
    fontSize: 12,
    lineHeight: '14px',
    fontWeight: 500,
    textTransform: 'uppercase',
    backgroundColor: '#383c47',
    cursor: 'pointer',
    paddingTop: 0,
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'row',
    '& svg.MuiTab-iconWrapper': {
      marginRight: 8,
      marginBottom: 0
    },
    '&.Mui-disabled': {
      opacity: 0.3,
      color: '#fff'
    },
    '&$selected': {
      color: '#FFA98F'
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 169, 143, 0.1)'
    },
    '&:active': {
      backgroundColor: 'rgba(255, 169, 143, 0.2)'
    }
  },
  tabIconFill: {
    marginBottom: 0,
    '& path': {
      fill: 'white'
    }
  },
  activeTabIconFill: {
    '& path': {
      fill: '#FFA98F'
    }
  },
  tabPanelWrapper: {
    paddingTop: 70
  },
  selected: {},
  editorOpen: {
    bottom: 84,
    backgroundColor: '#f0f8ff',
    width: 70,
    height: 70,
    '& svg': {
      maxHeight: '50px',
      maxWidth: '50px'
    }
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    paddingInline: 15,
    paddingBottom: 0,
    borderBottom: '1px solid #62646e'
  },
  headerLogoWrapper: {
    maxHeight: 32
  },
  closeIconWrapper: {
    position: 'absolute',
    right: 20,
    paddingTop: 0,
    paddingBottom: 0,
    '&:hover': {
      backgroundColor: 'transparent',
      '& svg': {
        '& path': {
          fill: '#7582FF'
        }
      }
    }
  },
  headerBottomRow: {
    position: 'absolute',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    top: 60,
    paddingInline: 17,
    paddingTop: 10,
    paddingBottom: 10,
    left: 1,
    backgroundColor: '#383c47',
    borderTop: '1px solid #62646e',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
  },
  amountOfResponses: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    lineHeight: '14px',
    fontWeight: 500,
    marginBottom: 0,
    marginTop: 0,
    textTransform: 'uppercase'
  },
  actionsWrapper: {
    width: '100%',
    textAlign: 'center'
  },
  contentRoot: {
    height: 'calc(100% - 45px)',
    overflow: 'auto',
    padding: 10,
    paddingBottom: 12,
    backgroundColor: '#24252A'
  },
  question: {
    maxWidth: 'fit-content',
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 169, 143, 0.1)',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    flexDirection: 'column',
    padding: 10,
    paddingInline: 16,
    paddingLeft: 50,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    color: '#fff',
    marginBottom: '1rem',
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      '& thead': {
        '& tr': {
          '& th': {
            padding: 8,
            textAlign: 'left',
            border: '1px solid #fff',
            paddingLeft: 0,
            fontWeight: 400
          }
        }
      },
      '& tbody': {
        '& tr': {
          '& td': {
            padding: 8,
            border: '1px solid #fff',
            fontWeight: 400
          }
        }
      }
    }
  },
  questionModified: {
    padding: 10,
    paddingInline: 16,
    marginBottom: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
  },
  questionModifiedText: {
    fontSize: 14,
    lineHeight: '21px',
    marginTop: 0,
    marginBottom: 0,
    marginRight: 10
  },
  renderKeyWordsWrapper: {
    fontSize: 14,
    lineHeight: '21px'
  },
  answer: {
    position: 'relative',
    backgroundColor: '#383C48',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginTop: '15px',
    marginBottom: 10,
    padding: '16px',
    borderRadius: '8px',
    overflow: 'hidden',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 'inherit',
      width: 3,
      background: 'linear-gradient(180deg, #616FFF 0%, #C935FD 100%)'
    },
    '& > img': {
      width: 32,
      height: 32
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: 15,
      marginBottom: 10,
      '& thead': {
        '& tr': {
          '& th': {
            padding: 8,
            textAlign: 'left',
            border: '1px solid #fff',
            paddingLeft: 0,
            fontWeight: 400
          }
        }
      },
      '& tbody': {
        '& tr': {
          '& td': {
            padding: 8,
            border: '1px solid #fff',
            fontWeight: 400
          }
        }
      }
    }
  },
  actionsRoot: {
    paddingBottom: 25,
    background: '#383c47'
  },
  dialogRoot: {
    display: 'none',
    backgroundColor: '#383c47'
  },
  dialogRootOpen: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #62646e'
  },
  splitModeDialogRootOpen: {
    height: '45vh',
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  searchInput: {
    marginBottom: 5,
    paddingInline: 10,
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: '#FFFFFF33'
      },
      '&:hover': {
        '& fieldset': {
          borderColor: '#616FFF'
        }
      },
      '& .Mui-disabled': {
        WebkitTextFillColor: '#7a7a7d',
        '& fieldset': {
          borderColor: '#FFFFFF33'
        }
      },
      '&.Mui-focused fieldset': {
        borderColor: '#616FFF',
        borderWidth: '2px'
      }
    },
    '& .MuiOutlinedInput-root.Mui-disabled:hover': {
      borderColor: '#FFFFFF33'
    },
    '& > div': {
      paddingLeft: 16,
      paddingRight: 8,
      borderRadius: 4,
      fontSize: 14,
      lineHeight: '16px'
    }
  },
  progressLine: {
    marginBottom: 12
  },
  telegramIconWrapper: {
    '&:hover': {
      backgroundColor: 'transparent'
    }
  },
  telegramIconWrapperDisabled: {
    pointerEvents: 'none',
    '& svg': {
      '& path': {
        fill: '#FFFFFF33'
      }
    }
  },
  telegramIcon: {
    fill: 'white',
    color: 'white',
    width: 32,
    height: 32,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    '& > svg': {
      width: 24,
      height: 24
    },
    '&:hover': {
      '& svg': {
        '& path': {
          fill: '#7582FF'
        }
      }
    }
  },
  regenerateButton: {
    color: '#d9d9e3',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    textTransform: 'inherit',
    border: '1px solid #565869',
    '& > svg': {
      marginRight: 8
    }
  },
  interactiveOptionsWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    marginTop: 10
  },
  interactiveOptionsTitle: {
    fontSize: 16,
    color: 'white',
    fontWeight: 500,
    marginBottom: 8,
    marginTop: 0
  },
  interactiveOptionsButtonsWrapper: {
    display: 'flex',
    flexDirection: 'row'
  },
  interactiveOptionsButton: {
    color: 'white',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: '14px',
    borderRadius: 4,
    backgroundColor: '#616FFF',
    marginRight: 8,
    padding: '11px 12px',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: '#7582FF'
    },
    '&:disabled': {
      color: '#FFFFFF33',
      backgroundColor: 'rgba(97, 111, 255, 0.2)',
      cursor: 'not-allowed'
    }
  },
  interactiveOptionsButtonSecondary: {
    backgroundColor: 'transparent',
    border: '1px solid #FFFFFF33',
    '&:hover': {
      border: '1px solid #7582FF',
      color: '#7582FF',
      backgroundColor: 'transparent'
    },
    '&:disabled': {
      color: '#FFFFFF33',
      border: '1px solid #FFFFFF33',
      backgroundColor: 'transparent',
      cursor: 'not-allowed'
    }
  },
  interactiveOptionsButtonSeparated: {
    position: 'absolute',
    right: 5
  },
  errorMessage: {
    fontSize: '.75rem',
    lineHeight: '1rem',
    margin: '10px auto',
    maxWidth: 300
  },
  cleanResults: {
    color: 'white',
    fontSize: 12,
    lineHeight: '14px',
    cursor: 'pointer',
    fontWeight: 500,
    padding: 5,
    paddingInline: 10,
    backgroundColor: 'transparent',
    transition: 'none',
    '&:hover': {
      color: '#7582FF'
    }
  },
  deleteIcon: {
    color: 'white',
    width: 24,
    height: 24,
    '&:hover': {
      fill: '#4a4acb'
    }
  },
  markdownWrapper: {
    color: 'white',
    width: '100%',
    fontSize: 14,
    lineHeight: '21px',
    '& p:first-of-type': {
      marginTop: 0
    },
    '& p:last-of-type': {
      marginBottom: 0
    }
  },
  emptyStateWrapper: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    paddingTop: 14
  },
  emptyStateTitle: {
    fontSize: 18,
    lineHeight: '27px',
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 500,
    marginBottom: 10
  },
  emptyStateText: {
    width: '100%',
    fontSize: 14,
    lineHeight: '21px',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 14,
    '& p': {
      marginTop: 0,
      marginBottom: 0
    }
  },
  emptyStateAdditionalText: {
    width: '100%',
    fontSize: 16,
    lineHeight: '24px',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 20
  },
  emptyStateBuilderCardsHorizontal: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 20
  },
  emptyStateBuilderCardsVertical: {
    flexDirection: 'column'
  },
  emptyStateBuilderCard: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: '#28292e',
    maxWidth: '33%',
    textAlign: 'start',
    paddingTop: 10,
    paddingBottom: 15,
    paddingInline: 16,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    '&:not(:last-child)': {
      marginRight: 10
    }
  },
  emptyStateBuilderCardVertical: {
    maxWidth: '100%',
    paddingLeft: 46,
    '&:not(:last-child)': {
      marginBottom: 10,
      marginRight: 0
    }
  },
  emptyStateBuilderCardSvgVerticalWrapper: {
    position: 'absolute',
    top: 17,
    left: 10
  },
  emptyStateBuilderCardTitle: {
    fontSize: 14,
    lineHeight: '21px',
    fontWeight: 600,
    color: 'white',
    marginTop: 9
  },
  emptyStateBuilderCardSubtitle: {
    fontSize: 14,
    lineHeight: '21px',
    fontWeight: 400,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5
  },
  hotActionCardsWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
    justifyContent: 'space-between'
  },
  hotActionCard: {
    borderRadius: 8,
    paddingInline: 16,
    paddingTop: 10,
    paddingBottom: 10,
    width: 'calc(50% - 5px)',
    minHeight: 62,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    backgroundColor: 'rgba(117, 130, 255, 0.1)',
    transition: 'background-color 0.2s',
    textAlign: 'start',
    '&:hover': {
      backgroundColor: '#616FFF'
    }
  },
  hotActionCardDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: 'inherit'
    }
  },
  hotActionCardText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: '21px',
    flex: 1
  },
  scrollBottomIcon: {
    position: 'absolute',
    zIndex: 1,
    bottom: 110,
    left: 'calc(50% - 9px)',
    backgroundColor: 'white',
    display: 'flex',
    borderRadius: '50%',
    padding: 3,
    cursor: 'pointer',
    border: '2px solid black'
  },
  link: {
    color: 'white',
    textDecoration: 'underline',
    textUnderlineOffset: 2
  },
  reactMarkdownTable: {
    border: '1px solid white',
    marginTop: 10,
    width: '100%',
    borderCollapse: 'collapse'
  },
  reactMarkdownThTd: {
    border: '1px solid white',
    padding: '8px',
    color: 'white'
  },
  reactMarkdownLists: {
    paddingLeft: 30
  },
  reactMarkdownLi: {
    marginTop: 4
  },
  reactMarkdownImg: {
    width: 'auto',
    maxWidth: '100%',
    marginTop: 7
  },
  codeBlockWrapper: {
    position: 'relative',
    paddingRight: 15,
    marginBottom: '1rem',
    backgroundColor: '#1e1e1e'
  },
  copyCodeButton: {
    position: 'absolute',
    top: 3,
    right: 0,
    zIndex: 1,
    padding: '0.25rem 0.5rem',
    borderRadius: 4,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.8)'
    },
    '& span': {
      margin: 0
    }
  },
  syntaxHighlighter: {
    backgroundColor: '#2d2d2d',
    padding: 16,
    borderRadius: 8
  },
  syntaxHighlighterAlternative: {
    fontSize: 13,
    lineHeight: '25px',
    fontFamily: 'monospace',
    background: '#282828',
    color: 'rgb(212, 212, 212)',
    padding: '3px 5px'
  },
  promptHasTableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'end'
  },
  promptHasTableButton: {
    maxWidth: 'fit-content',
    marginTop: 15,
    marginBottom: 10
  },
  renderKeyWords: {
    width: '100%'
  },
  displayNone: {
    display: 'none'
  },
  mb0: {
    marginBottom: 0
  },
  stepsProgressLineContainer: {
    position: 'relative',
    height: '7px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
    marginBottom: 15,
    overflow: 'hidden',
    marginInline: 12
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#616FFF',
    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  stepsProgress: {
    fontSize: 12,
    textAlign: 'left',
    marginBottom: 10,
    marginTop: 10,
    marginInline: 12,
    fontWeight: 600
  },
  interactiveModeFinishText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 600,
    marginTop: 0,
    marginBottom: 20,
    paddingInline: 25
  },
  initialLoading: {
    color: 'white',
    fontSize: 24,
    fontWeight: 600,
    display: 'flex',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  }
}));

const ColorButton = withStyles((theme) => ({
  root: {
    color: theme.white,
    background: 'none',
    paddingInline: 16,
    paddingTop: 7,
    paddingBottom: 7,
    borderRadius: 0,
    boxShadow: 'none',
    textTransform: 'uppercase',
    '&:hover': {
      boxShadow: 'none',
      background: 'none',
      '& svg': {
        '& path': {
          fill: '#7582FF'
        }
      }
    },
    '& svg': {
      fill: theme.buttonBg,
      marginRight: 8
    },
    '& img': {
      fill: theme.buttonBg,
      marginRight: 8
    }
  }
}))(Button);

const RenewIcon = () => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      stroke-width="1.5"
      viewBox="0 0 24 24"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-3 w-3"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline points="1 4 1 10 7 10"></polyline>
      <polyline points="23 20 23 14 17 14"></polyline>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
    </svg>
  );
};

const TelegramIcon = () => {
  const classes = useStyles();

  return (
    <div className={classes.telegramIcon}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M3 20V4L22 12L3 20ZM5 17L16.85 12L5 7V10.5L11 12L5 13.5V17Z" fill="white" />
      </svg>
    </div>
  );
};

const ArrowDownIcon = () => {
  const classes = useStyles();

  return (
    <div className={classes.scrollBottomIcon}>
      <svg
        height="18px"
        viewBox="0 -960 960 960"
        width="18px"
        fill="black"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M480-240 240-480l56-56 144 144v-368h80v368l144-144 56 56-240 240Z" />
      </svg>
    </div>
  );
};

const BpmnAiTabPanel = (props) => {
  const { children, value, index, style, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bpmnai-tabpanel-${index}`}
      aria-labelledby={`bpmnai-tab-${index}`}
      className={style}
      {...other}
    >
      {value === index && <Typography>{children}</Typography>}
    </div>
  );
};

const BpmnAi = ({
  fromCodeEditor,
  externalCommand,
  onToggleSplit,
  open: propOpen,
  onInsertJSONCode,
  onEditorFocus
}) => {
  const config = getConfig();

  const { bpmnAi } = config;

  const BPMN_AI_MODE_ROUTES = {
    ASSISTANT: '/assistant',
    CODE_GENERATION: '/builder',
    ANOMALIES_ANALYZER: '/anomalies-analyzer'
  };

  const INTERACTIVE_BUTTONS_OPTIONS = {
    INSERT_CODE: 'insert',
    ABORT_GENERATION: 'abort',
    SKIP_SINGLE_GENERATION: 'skip',
    SKIP_WHOLE_STEP: 'skipStep'
  };

  const { info: userInfo } = useAuth();

  const [open, setOpen] = React.useState(propOpen || false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [tabValue, setTabValue] = React.useState(1);
  const [activeAIMode, setActiveAIMode] = React.useState(BPMN_AI_MODE_ROUTES.ASSISTANT);
  const [hotActionPrompts, setHotActionPrompts] = React.useState([]);
  const [search, setSearch] = React.useState({ assistant: '', builder: '' });
  const [loading, setLoading] = React.useState(false);
  const [interactiveStep, setInteractiveStep] = React.useState(0);
  const [interactiveTotalSteps, setInteractiveTotalSteps] = React.useState(0);
  const [interactiveProgressPercentage, setInteractiveProgressPercentage] = React.useState(0);
  const [interactiveDone, setInteractiveDone] = React.useState(false);
  const [assistantSessionId, setAssistantSessionId] = React.useState('');
  const [builderSessionId, setBuilderSessionId] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [greetingMessage, setGreetingMessage] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [lastInputs, setLastInputs] = React.useState({
    assistant: '',
    builder: ''
  });
  const [builderInputFromHistory, setBuilderInputFromHistory] = React.useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);
  const [revealTableInPrompt, setRevealTableInPrompt] = React.useState(false);
  const [hiddenButtonGroups, setHiddenButtonGroups] = React.useState({});
  const [pressedInteractiveButtons, setPressedInteractiveButtons] = React.useState({});
  const [hideStepsProgressLine, setHideStepsProgressLine] = React.useState(false);
  const [emptyStateBuilderCardsVertical, setEmptyStateBuilderCardsVertical] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    setOpen(propOpen);
  }, [propOpen]);

  const bpmnAiRef = React.useRef();
  const scrollableWrapperRef = React.useRef();
  const scrollToElementRef = React.useRef();
  const textFieldRef = React.useRef();

  const dispatch = useDispatch();
  const classes = useStyles();
  const t = useTranslate('BpmnAi');

  const temporaryHiddenArrowDown = true;

  const handleToggleBpmnAI = React.useCallback(() => {
    if (!bpmnAi) return;

    if (onToggleSplit) {
      onToggleSplit();
    } else {
      setOpen((prevOpen) => !prevOpen);
    }
  }, [onToggleSplit]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);

    if (newValue === 1) {
      setActiveAIMode(BPMN_AI_MODE_ROUTES.ASSISTANT);
    } else if (newValue === 2) {
      setActiveAIMode(BPMN_AI_MODE_ROUTES.CODE_GENERATION);
    }
  };

  const handleChange = ({ target: { value } }) => {
    setSearch((prevSearch) => ({
      ...prevSearch,
      [activeAIMode.replace('/', '')]: value
    }));
  };

  const handleKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleSearch();
    }
  };

  const handleInteractiveButtonsOptions = async (buttonId, buttonTitle, responseIndex) => {
    if (!buttonId) return;

    const currentTab = activeAIMode.replace('/', '');

    setPressedInteractiveButtons((prevState) => ({
      ...prevState,
      [responseIndex]: buttonTitle || buttonId
    }));

    executeScrollToElement();

    if (interactiveDone) {
      setHiddenButtonGroups((prevState) => {
        const newState = { ...prevState };
        for (let i = 0; i <= responseIndex; i++) {
          newState[i] = true;
        }
        return newState;
      });

      handleJSONCodeInsertion(buttonId, responseIndex);

      setResults((prevResults) => ({
        ...prevResults,
        builder: []
      }));

      setInteractiveStep(0);
      setInteractiveTotalSteps(0);
      setInteractiveProgressPercentage(0);
      setInteractiveDone(false);
      setPressedInteractiveButtons({});
    } else {
      let input = lastInputs[currentTab] || search[currentTab];

      if (currentTab === 'assistant' && (!input || typeof input !== 'string'))
        input = lastInputs.assistant || '';
      if (currentTab === 'builder' && (!input || typeof input !== 'string'))
        input = builderInputFromHistory || '';

      const searchParams = {
        input,
        formInput: { id: buttonId, title: buttonTitle },
        skipStep: buttonId === INTERACTIVE_BUTTONS_OPTIONS.SKIP_WHOLE_STEP
      };

      setHideStepsProgressLine(false);
      handleJSONCodeInsertion(buttonId, responseIndex);

      await handleSearch(searchParams);

      setHiddenButtonGroups((prevState) => {
        const newState = { ...prevState };
        for (let i = 0; i <= responseIndex; i++) {
          newState[i] = true;
        }
        return newState;
      });
    }
  };

  const resetHiddenButtonGroups = () => {
    setHiddenButtonGroups({});
  };

  const handleJSONCodeInsertion = (buttonId, responseIndex) => {
    if (!onInsertJSONCode) return;

    if (results['builder']?.length && buttonId === INTERACTIVE_BUTTONS_OPTIONS.INSERT_CODE) {
      const result = results['builder'][responseIndex];
      let jsonCodeToInsert =
        result?.response?.message?.match(/```json\s*([\s\S]*?)\s*```/)?.[1] ||
        result?.response?.result?.match(/```json\s*([\s\S]*?)\s*```/)?.[1] ||
        '';

      if (jsonCodeToInsert.startsWith('{') && jsonCodeToInsert.endsWith('}')) {
        jsonCodeToInsert = jsonCodeToInsert.slice(1, -1);
      }

      onInsertJSONCode(jsonCodeToInsert);
    }
  };

  const handlePaste = (event) => {
    try {
      if (event.clipboardData.types.includes('text/html')) {
        const pastingHTML = event.clipboardData.getData('text/html');

        if (pastingHTML.indexOf('<table') === -1) return;

        setTimeout(() => {
          const currentTab = activeAIMode.replace('/', '');
          setSearch((prevSearch) => ({
            ...prevSearch,
            [currentTab]: sanitizeHtml(pastingHTML, options)
          }));
        }, 100);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = async (props) => {
    if (loading) return;

    const currentTab = activeAIMode.replace('/', '');
    let input = props?.input ?? search[currentTab];
    const regenerate = props?.regenerate;

    if (currentTab === 'assistant' && (!input || typeof input !== 'string'))
      input = lastInputs.assistant || '';
    if (currentTab === 'builder' && (!input || typeof input !== 'string'))
      input = lastInputs.builder || '';

    if (!input || typeof input !== 'string') return;

    const interactiveOptionId = props?.formInput?.id;
    const interactiveOptionTitle = props?.formInput?.title;
    const skipStep = props?.skipStep || false;
    const analyzeRoute = props?.anomaliesAnalyzeRoute;
    let response;

    setLoading(true);
    setError(null);

    if (!regenerate) {
      setLastInputs((prev) => ({
        ...prev,
        [currentTab]: input
      }));
    }

    if (currentTab === 'assistant') setHideStepsProgressLine(true);
    if (currentTab === 'builder') setHideStepsProgressLine(false);

    const requestPayload = {
      sessionId: currentTab === 'assistant' ? assistantSessionId : builderSessionId,
      input: regenerate ? lastInputs[currentTab] || input : input,
      formInput: { id: interactiveOptionId, title: interactiveOptionTitle },
      skipStep: skipStep,
      dataSource: 'all',
      requestOrigin: 'admin'
    };

    if (currentTab === 'assistant') {
      requestPayload.question = input;
      delete requestPayload.input;
      delete requestPayload.formInput;
    }

    if (currentTab === 'builder') {
      delete requestPayload.dataSource;
      delete requestPayload.requestOrigin;
    }

    if (analyzeRoute) {
      response = await sendAiAnomaliesAnalyze({ input: '/analize' })(dispatch);
    } else {
      response = await getAiPrompts(requestPayload, activeAIMode)(dispatch);
    }

    if (currentTab === 'builder' && response) {
      setInteractiveStep(response?.step);
      setInteractiveTotalSteps(response?.totalSteps);
      setInteractiveProgressPercentage(response?.progressInPercentage);
      setInteractiveDone(response?.done);
    }

    setLoading(false);

    if (response instanceof Error) {
      setError(response);
    }

    const newResult = {
      withError: response instanceof Error,
      keyWords: input,
      response
    };

    setResults((prevResults) => ({
      ...prevResults,
      [currentTab]: [...(prevResults[currentTab] || []), newResult]
    }));

    if (activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION) resetHiddenButtonGroups();

    setSearch((prevSearch) => ({
      ...prevSearch,
      [currentTab]: ''
    }));

    executeScrollToElement();

    if (props?.formInput?.id !== INTERACTIVE_BUTTONS_OPTIONS.INSERT_CODE) {
      textFieldRef.current?.focus();
    } else if (onEditorFocus) {
      onEditorFocus();
    }
  };

  const handleCopyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleTableInPromptVisibility = () => {
    setRevealTableInPrompt((prevState) => !prevState);
  };

  const MarkDownCodeBlock = ({ inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeContent = String(children).replace(/\n$/, '');

    if (!inline && match) {
      return (
        <div className={classes.codeBlockWrapper}>
          {!copied ? (
            <Tooltip title={t('Copy')} className={classes.copyCodeButton}>
              <IconButton
                className={classes.copyIcon}
                onClick={() => handleCopyToClipboard(codeContent)}
                size="large"
              >
                <img src={CopySvgIcon} alt={'copy'} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title={t('Copied')} className={classes.copyCodeButton}>
              <IconButton className={classes.copyIcon} size="large">
                <CheckCircleIcon style={{ width: 24, height: 24 }} htmlColor="white" />
              </IconButton>
            </Tooltip>
          )}
          <SyntaxHighlighter
            style={vscDarkPlus}
            className={classes.syntaxHighlighter}
            language={match[1]}
            PreTag="div"
            codeTagProps={{
              style: {
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }
            }}
            {...props}
          >
            {codeContent}
          </SyntaxHighlighter>
        </div>
      );
    } else if (children[0] !== '') {
      return (
        <code className={classes.syntaxHighlighterAlternative} {...props}>
          {children}
        </code>
      );
    }
  };

  const MarkdownRenderer = ({ content, className }) => {
    if (!content) return null;

    const sanitizedContent = content.trimEnd().endsWith('```')
      ? content.trimEnd().slice(0, -3)
      : content;

    const parts = sanitizedContent.split(
      /(```json[\s\S]*?```|```javascript[\s\S]*?```|<table[\s\S]*?<\/table>|\`\`\`\n)/g
    );

    const renderPart = (part, index) => {
      if (part.startsWith('<table')) return <div key={index}>{renderHTML(part)}</div>;

      if (part.startsWith('```json')) {
        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={{ code: MarkDownCodeBlock }}
          >
            {part}
          </ReactMarkdown>
        );
      }

      return (
        <ReactMarkdown
          key={index}
          remarkPlugins={[remarkGfm]}
          components={{
            code: MarkDownCodeBlock,
            a: ({ ...props }) => (
              <a
                className={classes.link}
                href={props.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {props.children}
              </a>
            ),
            table: ({ ...props }) => (
              <table className={classes.reactMarkdownTable} {...props} />
            ),
            th: ({ ...props }) => <th className={classes.reactMarkdownThTd} {...props} />,
            td: ({ ...props }) => <td className={classes.reactMarkdownThTd} {...props} />,
            ul: ({ ...props }) => <ul className={classes.reactMarkdownLists} {...props} />,
            ol: ({ ...props }) => <ol className={classes.reactMarkdownLists} {...props} />,
            li: ({ ...props }) => <li className={classes.reactMarkdownLi} {...props} />,
            img: ({ ...props }) => <img className={classes.reactMarkdownImg} {...props} />
          }}
        >
          {part}
        </ReactMarkdown>
      );
    };

    return <div className={className}>{parts.map(renderPart)}</div>;
  };

  const formatResponseToMarkdownRenderer = (response) => {
    if (!response) return null;

    const cleanedResponse = response.replace(/```markdown\n?/g, '');

    const isJson = cleanedResponse.trim().startsWith('{') && cleanedResponse.trim().endsWith('}');
    const isTable = cleanedResponse.includes('<table');

    if (isJson) {
      return `\`\`\`json\n${cleanedResponse}`;
    } else if (isTable) {
      return cleanedResponse;
    } else {
      return cleanedResponse.trim();
    }
  };

  const StepsProgressLine = () => {
    const classes = useStyles();
    const hasToShowStepsProgressLine = interactiveTotalSteps > 0;

    if (interactiveDone)
      return <p className={classes.interactiveModeFinishText}>{t('InteractiveModeFinishText')}</p>;
    if (!hasToShowStepsProgressLine) return null;

    return (
      <>
        <p className={classes.stepsProgress}>
          {t('InteractiveStepsProgress', {
            current: interactiveStep,
            total: interactiveTotalSteps
          })}
        </p>
        {interactiveProgressPercentage ? (
          <div className={classes.stepsProgressLineContainer}>
            <div
              className={classes.progressBar}
              style={{ width: `${interactiveProgressPercentage}%` }}
            />
          </div>
        ) : null}
      </>
    );
  };

  const executeScrollToElement = () => {
    setTimeout(() => {
      const wrapper = scrollableWrapperRef.current;
      const target = scrollToElementRef.current;

      if (wrapper && target) {
        const wrapperTop = wrapper.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const scrollOffset = targetTop - wrapperTop + wrapper.scrollTop;
        const maxScrollTop = wrapper.scrollHeight - wrapper.clientHeight;
        const scrollTo = Math.min(scrollOffset, maxScrollTop);

        wrapper.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }
    }, 200);
  };

  const cleanChatHistory = async () => {
    setLoading(true);

    const deleteChatHistory =
      activeAIMode === BPMN_AI_MODE_ROUTES.ASSISTANT
        ? deleteAssistantChatHistory
        : deleteCodeGenerationChatHistory;

    const sessionId =
      activeAIMode === BPMN_AI_MODE_ROUTES.ASSISTANT ? assistantSessionId : builderSessionId;
    await deleteChatHistory(sessionId)(dispatch).then(() => {
      setResults((prevResults) => ({
        ...prevResults,
        [activeAIMode.replace('/', '')]: []
      }));
      setInteractiveStep(0);
      setInteractiveTotalSteps(0);
      setInteractiveProgressPercentage(0);
      setLoading(false);
      setError(false);
      if (activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION) setPressedInteractiveButtons({});
      setHideStepsProgressLine(true);
    });
  };

  const getChatHistory = async (assistantSessionId, dispatch) => {
    setLoading(true);
    const getChatHistoryResponse = await getAiChatHistory(assistantSessionId)(dispatch);

    const humanType = getChatHistoryResponse
      .filter((item) => item.type === 'human')
      .map((item) => ({ keyWords: item.data.content }));

    const aiType = getChatHistoryResponse
      .filter((item) => item.type === 'ai')
      .map((item) => ({
        response: {
          message: item.data.content
        }
      }));

    const combinedResults = humanType.map((entry, index) => {
      if (aiType[index]) {
        entry.response = aiType[index].response;
      }
      return entry;
    });

    combinedResults.push(...aiType.slice(humanType.length));
    setResults((prevResults) => ({
      ...prevResults,
      assistant: combinedResults
    }));

    setLoading(false);
    return combinedResults;
  };

  const getBuilderHistory = async (builderSessionId, dispatch) => {
    setLoading(true);
    const getBuilderHistoryResponse = await getAiBuilderHistory(builderSessionId)(dispatch);

    const historyInput = getBuilderHistoryResponse?.input;
    setBuilderInputFromHistory(historyInput);

    const userType = getBuilderHistoryResponse?.interactions
      ?.filter((item) => item.type === 'user')
      ?.map((item) => ({ keyWords: item.message }));

    const systemItems = getBuilderHistoryResponse?.interactions?.filter(
      (item) => item.type === 'system'
    );

    const systemType = systemItems?.map((item, index) => {
      const isLast = index === systemItems.length - 1;
      const systemEntry = {
        response: {
          message: item.message
        }
      };

      if (isLast && Array.isArray(item.options)) {
        systemEntry.response.options = item.options;
      }

      return systemEntry;
    });

    const combinedResults = userType?.map((entry, index) => {
      if (systemType[index]) {
        entry.response = systemType[index].response;
      }
      return entry;
    });

    combinedResults?.push(...systemType.slice(userType?.length));
    setResults((prevResults) => ({
      ...prevResults,
      builder: combinedResults
    }));

    setLoading(false);
    return combinedResults;
  };

  const renderGreetingMessage = (greetingData, activeTab) => {
    if (!greetingData?.length || !activeTab) return null;

    if (activeTab === 1) {
      return (
        <div className={classes.emptyStateWrapper}>
          {greetingData?.map((greeting) => (
            <>
              <Typography className={classes.emptyStateTitle}>{greeting.title || ''}</Typography>
              {greeting.content && (
                <MarkdownRenderer className={classes.emptyStateText} content={greeting.content} />
              )}
            </>
          ))}
        </div>
      );
    }

    if (activeTab === 2) {
      return (
        <div className={classes.emptyStateWrapper}>
          <Typography className={classes.emptyStateTitle}>{t('CodeGenerationTitle')}</Typography>
          <Typography className={classes.emptyStateText}>{t('CodeGenerationText')}</Typography>
          <div
            className={classNames({
              [classes.emptyStateBuilderCardsHorizontal]: true,
              [classes.emptyStateBuilderCardsVertical]: emptyStateBuilderCardsVertical
            })}
          >
            <div
              className={classNames({
                [classes.emptyStateBuilderCard]: true,
                [classes.emptyStateBuilderCardVertical]: emptyStateBuilderCardsVertical
              })}
            >
              <BuilderStepOneIcon
                className={classNames({
                  [classes.emptyStateBuilderCardSvgVerticalWrapper]: emptyStateBuilderCardsVertical
                })}
              />

              <Typography className={classes.emptyStateBuilderCardTitle}>
                {t('EmptyStateCardOneTitle')}
              </Typography>
              <Typography className={classes.emptyStateBuilderCardSubtitle}>
                {t('EmptyStateCardOneSubtitle')}
              </Typography>
            </div>
            <div
              className={classNames({
                [classes.emptyStateBuilderCard]: true,
                [classes.emptyStateBuilderCardVertical]: emptyStateBuilderCardsVertical
              })}
            >
              <BuilderStepTwoIcon
                className={classNames({
                  [classes.emptyStateBuilderCardSvgVerticalWrapper]: emptyStateBuilderCardsVertical
                })}
              />

              <Typography className={classes.emptyStateBuilderCardTitle}>
                {t('EmptyStateCardTwoTitle')}
              </Typography>
              <Typography className={classes.emptyStateBuilderCardSubtitle}>
                {t('EmptyStateCardTwoSubtitle')}
              </Typography>
            </div>
            <div
              className={classNames({
                [classes.emptyStateBuilderCard]: true,
                [classes.emptyStateBuilderCardVertical]: emptyStateBuilderCardsVertical
              })}
            >
              <BuilderStepThreeIcon
                className={classNames({
                  [classes.emptyStateBuilderCardSvgVerticalWrapper]: emptyStateBuilderCardsVertical
                })}
              />

              <Typography className={classes.emptyStateBuilderCardTitle}>
                {t('EmptyStateCardThreeTitle')}
              </Typography>
              <Typography className={classes.emptyStateBuilderCardSubtitle}>
                {t('EmptyStateCardThreeSubtitle')}
              </Typography>
            </div>
          </div>
          <Typography className={classes.emptyStateAdditionalText}>
            {t('EmptyStateBottomText')} 🚀
          </Typography>
        </div>
      );
    }
  };

  const renderHotActionPrompts = (actionPrompts) => {
    if (!actionPrompts?.length) return null;

    return (
      <div className={classes.hotActionCardsWrapper}>
        {actionPrompts?.map((prompt) => (
          <div
            key={prompt?.id}
            className={classNames({
              [classes.hotActionCard]: true,
              [classes.hotActionCardDisabled]: loading
            })}
            onClick={async () => {
              if (loading) return;

              const currentTab = activeAIMode.replace('/', '');
              setSearch((prevSearch) => ({
                ...prevSearch,
                [currentTab]: prompt?.text
              }));

              await handleSearch({ input: prompt?.text });
            }}
          >
            <Typography className={classes.hotActionCardText}>{prompt?.text}</Typography>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = (activeTab) => {
    return (
      <>
        {renderGreetingMessage(greetingMessage, activeTab)}
        {activeTab === 1 && renderHotActionPrompts(hotActionPrompts)}
      </>
    );
  };

  const renderAIResponse = (response, responseIndex) => {
    if (!response) return null;

    const { message, result, options: interactiveButtons } = response;

    const msg = typeof message === 'string' ? message.trim() : '';
    const res = typeof result === 'string' ? result.trim() : '';

    if (!msg && !res) return null;

    const shouldHideInteractiveButtons = hiddenButtonGroups[responseIndex];
    const chosenInteractiveOption = pressedInteractiveButtons[responseIndex];
    const chosenOption = chosenInteractiveOption
      ? chosenInteractiveOption.charAt(0).toUpperCase() + chosenInteractiveOption.slice(1)
      : '';

    return (
      <>
        <div className={classes.answer}>
          <div className={classes.markdownWrapper}>
            <MarkdownRenderer content={formatResponseToMarkdownRenderer(msg || res)} />
          </div>

          {interactiveButtons?.length > 0 && !shouldHideInteractiveButtons ? (
            <div className={classes.interactiveOptionsWrapper}>
              <div className={classes.interactiveOptionsButtonsWrapper}>
                {interactiveButtons.map((button) => (
                  <Button
                    key={button?.id}
                    disabled={loading}
                    onClick={() =>
                      handleInteractiveButtonsOptions(button?.id, button?.title, responseIndex)
                    }
                    className={classNames({
                      [classes.interactiveOptionsButton]: true,
                      [classes.interactiveOptionsButtonSecondary]: !button?.isPrimary
                    })}
                  >
                    {button?.title}
                  </Button>
                ))}
                {interactiveStep !== interactiveTotalSteps ? (
                  <Button
                    key={INTERACTIVE_BUTTONS_OPTIONS.SKIP_WHOLE_STEP}
                    disabled={loading}
                    onClick={() =>
                      handleInteractiveButtonsOptions(
                        INTERACTIVE_BUTTONS_OPTIONS.SKIP_WHOLE_STEP,
                        t('SkipStep'),
                        responseIndex
                      )
                    }
                    className={classNames(
                      classes.interactiveOptionsButton,
                      classes.interactiveOptionsButtonSecondary,
                      classes.interactiveOptionsButtonSeparated
                    )}
                  >
                    {t('SkipStep')}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {chosenInteractiveOption && activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION ? (
          <div className={classNames(classes.question, classes.questionModified)}>
            <p className={classes.questionModifiedText}>{chosenOption}</p>
            <ChosenInteractiveOptionBuilderIcon />
          </div>
        ) : null}
      </>
    );
  };

  React.useEffect(() => {
    if (!open || !isFirstLoad) return;

    const getAsyncData = async () => {
      try {
        let localStorageAssistantSessionId = localStorage.getItem('assistantSessionId');
        let localStorageBuilderSessionId = localStorage.getItem('builderSessionId');

        if (localStorageAssistantSessionId !== userInfo?.userId) {
          localStorage.setItem('assistantSessionId', userInfo?.userId);
          setAssistantSessionId(userInfo?.userId);
        } else {
          setAssistantSessionId(localStorageAssistantSessionId);
        }

        if (!localStorageBuilderSessionId) {
          const { sessionId } = await getBuilderSessionId()(dispatch);
          localStorage.setItem('builderSessionId', sessionId);
          setBuilderSessionId(sessionId);
        } else {
          setBuilderSessionId(localStorageBuilderSessionId);
        }

        setGreetingMessage([await getGreetingMessage()(dispatch)]);
        if (localStorageAssistantSessionId)
          await getChatHistory(localStorageAssistantSessionId, dispatch);
        if (localStorageBuilderSessionId)
          await getBuilderHistory(localStorageBuilderSessionId, dispatch);
        setHotActionPrompts(await getHotActionPrompts()(dispatch));

        setIsFirstLoad(false);
      } catch (error) {
        console.error('Error getAsyncData:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    if (bpmnAi) getAsyncData();
  }, [open, dispatch]);

  React.useEffect(() => {
    const wrapperRefCurrent = scrollableWrapperRef.current;
    const textFieldRefCurrent = textFieldRef.current;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        requestAnimationFrame(() => {
          if (entry.contentRect.width < 650) {
            setEmptyStateBuilderCardsVertical(true);
          } else {
            setEmptyStateBuilderCardsVertical(false);
          }
        });
      }
    });

    const handleScroll = () => {
      if (wrapperRefCurrent) {
        const { scrollTop, scrollHeight, clientHeight } = wrapperRefCurrent;
        const isCloseToBottom = scrollHeight - (scrollTop + clientHeight) < 200;
        const isScrollable = scrollHeight > clientHeight;

        setShowScrollToBottom(isScrollable && !isCloseToBottom);
      }
    };

    const checkContentHeight = () => {
      if (wrapperRefCurrent) {
        const { scrollHeight, clientHeight } = wrapperRefCurrent;
        const isScrollable = scrollHeight > clientHeight;

        setShowScrollToBottom(isScrollable);
      }
    };

    if (wrapperRefCurrent) {
      wrapperRefCurrent.addEventListener('scroll', handleScroll);
      checkContentHeight();
    }

    if (bpmnAiRef.current) observer.observe(bpmnAiRef.current);

    if (textFieldRefCurrent) {
      hotkeys('/', (event) => {
        event.preventDefault();
        textFieldRefCurrent.focus();
      });
    }

    return () => {
      if (bpmnAiRef.current) observer.unobserve(bpmnAiRef.current);
      if (textFieldRefCurrent) hotkeys.unbind('/');
      if (wrapperRefCurrent) wrapperRefCurrent.removeEventListener('scroll', handleScroll);
    };
  }, []);

  React.useEffect(() => {
    const fetchExternalCommand = async () => {
      if (externalCommand) {
        if (!open) handleToggleBpmnAI();

        setActiveAIMode(BPMN_AI_MODE_ROUTES.ANOMALIES_ANALYZER);
        setSearch(externalCommand);
        await handleSearch({
          input: externalCommand,
          anomaliesAnalyzeRoute: BPMN_AI_MODE_ROUTES.ANOMALIES_ANALYZER
        });

        dispatch(sendExternalCommand(''));
      }
    };

    fetchExternalCommand();
  }, [dispatch, externalCommand, open, handleToggleBpmnAI, handleSearch]);

  React.useEffect(() => {
    hotkeys(HOTKEY_OPEN_BPMN_AI, (e) => {
      e.preventDefault();
      handleToggleBpmnAI();
    });

    return () => {
      hotkeys.unbind(HOTKEY_OPEN_BPMN_AI);
    };
  }, [handleToggleBpmnAI]);

  const Header = () => {
    return (
      <div className={classes.header}>
        <div className={classes.headerLogoWrapper}>
          <LiquioIntelLogoWhiteSvg />
        </div>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="LiquioAiTabs"
          classes={{ root: classes.tabsRoot, indicator: classes.tabsIndicator }}
        >
          <Tab
            label="Assistant"
            disabled={loading}
            icon={
              <AssistantIcon
                className={classNames({
                  [classes.tabIconFill]: true,
                  [classes.mb0]: true,
                  [classes.activeTabIconFill]: activeAIMode !== BPMN_AI_MODE_ROUTES.CODE_GENERATION
                })}
              />
            }
            classes={{ root: classes.tabRoot, selected: classes.selected }}
            value={1}
          />
          <Tab
            label="Builder"
            disabled={loading}
            icon={
              <BuilderIcon
                className={classNames({
                  [classes.tabIconFill]: true,
                  [classes.mb0]: true,
                  [classes.activeTabIconFill]: activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION
                })}
              />
            }
            classes={{ root: classes.tabRoot, selected: classes.selected }}
            value={2}
          />
        </Tabs>
        <IconButton onClick={handleToggleBpmnAI} className={classes.closeIconWrapper}>
          <CloseIcon />
        </IconButton>

        <HeaderBottomRow />
      </div>
    );
  };

  const HeaderBottomRow = () => {
    const responsesAmount =
      activeAIMode === BPMN_AI_MODE_ROUTES.ASSISTANT
        ? results['assistant']?.length
        : results['builder']?.length;
    const buttonText =
      activeAIMode === BPMN_AI_MODE_ROUTES.ASSISTANT ? t('ClearChat') : t('TerminateBuilder');

    if (!responsesAmount) return null;

    // TODO: for ukrainian language there is has to be function which returns "результат, результати, результатів" based on the responsesAmount
    const responsesAmountText = `${responsesAmount} ${
      responsesAmount > 1 ? t('Responses') : t('Response')
    }`;

    return (
      <div className={classes.headerBottomRow}>
        <p className={classes.amountOfResponses}>{responsesAmountText}</p>
        <ColorButton
          variant="contained"
          color="primary"
          onClick={cleanChatHistory}
          className={classNames(classes.actionBtn, classes.cleanResults)}
        >
          <DeleteIcon className={classes.deleteIcon} />
          {buttonText}
        </ColorButton>
      </div>
    );
  };

  if (!['development', 'stage'].includes(config?.application?.environment)) {
    return null;
  }

  return (
    <>
      {bpmnAi && fromCodeEditor && !open && (
        <IconButton
          onClick={handleToggleBpmnAI}
          className={classNames({
            [classes.root]: true,
            [classes.editorOpen]: true
          })}
        >
          <LiquioIntelLogo />
        </IconButton>
      )}

      <div
        ref={bpmnAiRef}
        className={classNames({
          [classes.dialogRoot]: true,
          [classes.dialogRootOpen]: open && fromCodeEditor,
          [classes.splitModeDialogRootOpen]: open && !fromCodeEditor
        })}
      >
        <Header />
        <div ref={scrollableWrapperRef} className={classes.contentRoot}>
          {initialLoading ? (
            <div className={classes.initialLoading}>{t('InitialLoading')}</div>
          ) : (
            <>
              {activeAIMode === BPMN_AI_MODE_ROUTES.ASSISTANT &&
              (!results['assistant'] || !results['assistant']?.length)
                ? renderEmptyState(tabValue)
                : null}
              {activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION &&
              (!results['builder'] || !results['builder']?.length)
                ? renderEmptyState(tabValue)
                : null}

              <BpmnAiTabPanel value={tabValue} index={1} style={classes.tabPanelWrapper}>
                {results['assistant']?.map(({ keyWords, response, withError }, index) => {
                  const containsTable = keyWords && keyWords.includes('<table');

                  return (
                    <>
                      {keyWords ? (
                        <div className={classes.question} id={keyWords}>
                          {containsTable ? (
                            <>
                              <div className={classes.promptHasTableWrapper}>
                                <Typography>{t('PromptHasTable')}</Typography>
                                <Button
                                  variant="outlined"
                                  className={classes.promptHasTableButton}
                                  onClick={toggleTableInPromptVisibility}
                                >
                                  {revealTableInPrompt ? t('Hide') : t('Show')}
                                </Button>
                              </div>
                              {revealTableInPrompt && (
                                <div className={classes.renderKeyWordsWrapper}>
                                  {renderHTML(keyWords)}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className={classes.renderKeyWordsWrapper}>
                              {renderHTML(keyWords)}
                            </div>
                          )}
                        </div>
                      ) : null}

                      {!withError ? renderAIResponse(response, index) : null}
                    </>
                  );
                })}
              </BpmnAiTabPanel>

              <BpmnAiTabPanel value={tabValue} index={2} style={classes.tabPanelWrapper}>
                {results['builder']?.map(({ keyWords, response, withError }, index) =>
                  !withError ? (
                    <>
                      {renderAIResponse(response, index)}
                      {keyWords &&
                      !/^https?:\/\/\S+$/.test(keyWords) &&
                      !keyWords.includes('<table') ? (
                        <div className={classNames(classes.question, classes.questionModified)}>
                          <p className={classes.questionModifiedText}>{keyWords}</p>
                          <ChosenInteractiveOptionBuilderIcon />
                        </div>
                      ) : null}
                    </>
                  ) : null
                )}
              </BpmnAiTabPanel>
            </>
          )}
          <div ref={scrollToElementRef} />
        </div>

        <div className={classes.actionsRoot}>
          <div className={classes.actionsWrapper}>
            {error ? (
              <>
                <Typography className={classes.errorMessage}>
                  <RenderOneLine title={error.message} />
                </Typography>
                <Button
                  onClick={() => handleSearch({ regenerate: true })}
                  variant="outlined"
                  className={classes.regenerateButton}
                >
                  <RenewIcon />
                  {t('Regenerate')}
                </Button>
              </>
            ) : null}

            {!temporaryHiddenArrowDown && (
              <div onClick={executeScrollToElement} hidden={!showScrollToBottom}>
                <ArrowDownIcon />
              </div>
            )}

            <ProgressLine classCustom={classes.progressLine} loading={loading} />

            {!hideStepsProgressLine && activeAIMode === BPMN_AI_MODE_ROUTES.CODE_GENERATION ? (
              <StepsProgressLine />
            ) : null}

            <TextField
              inputRef={textFieldRef}
              value={search[activeAIMode.replace('/', '')]}
              disabled={loading}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className={classes.searchInput}
              placeholder={t('StartType')}
              multiline={true}
              maxRows={MAX_ROWS_SEARCH_FIELD}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleSearch}
                      size="small"
                      className={classNames({
                        [classes.telegramIconWrapper]: true,
                        [classes.telegramIconWrapperDisabled]: loading
                      })}
                    >
                      <TelegramIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default BpmnAi;
