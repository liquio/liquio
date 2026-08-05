import TextFieldsOutlinedIcon from '@mui/icons-material/TextFieldsOutlined';

export default {
  type: 'Element',
  group: 'Basic',
  Icon: TextFieldsOutlinedIcon,
  defaultData: {
    control: 'text.block',
    htmlBlock:
      '<h3>Загальний опис</h3><p>Основа реалізованого продукту BPMN - сервіси BPMN Manager, BPMN Task, BPMN Event, BPMN Gateway. Кожен із зазначених сервісів виконує свою частину роботи, а з іншими комунікує через RabbitMQ.</p><h3>Workflow</h3><p>Сервіс відповідає за:</p><ul><li>парсинг BPMN схеми;</li><li>отримання та опрацювання повідомлень по RabbitMQ від сервісів BPMN Task, BPMN Event та BPMN Gateway;</li><li>визначення подальшого виконання процесу згідно BPMN схеми;</li><li>інформування сервісів BPMN Task, BPMN Event та BPMN Gateway по RabbitMQ про необхідність опрацювання процесу з їх сторони.</li></ul><p>Сервіс підтримує горизонтальне масштабування.</p><p><br></p>',
    params: undefined,
  },
};
