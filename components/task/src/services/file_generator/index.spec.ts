import { FileGeneratorService } from './index';

const render = (htmlTemplate: string, data: any = {}, variables: any = {}, workflow: any = { id: 'w1' }) =>
  new FileGeneratorService().createHtml({
    workflow,
    documentTemplate: { htmlTemplate },
    document: { data },
    variables,
  });

describe('FileGeneratorService.createHtml', () => {
  afterEach(() => jest.useRealTimers());

  it.each(['a}|$|{b', 'a}|^|{b'])('does not inject through data key %s', async (key) => {
    const html = await render('<p>SSRFA</p><p>{{ssrfread.x}}</p><p>SSRFB</p>', {
      ssrfread: { [key]: '<iframe src="http://register:8080/test/ping"></iframe>', x: 'ok' },
    });
    expect(html).toBe('<p>SSRFA</p><p>ok</p><p>SSRFB</p>');
    expect(html).not.toContain('iframe');
  });

  it('leaves legacy placeholders inert', async () => {
    expect(await render('<p>{step.name}</p>', { step: { name: '<b>x</b>' } })).toBe('<p>{step.name}</p>');
  });

  it('escapes values', async () => {
    expect(await render('{{step.name}}', { step: { name: '<iframe src="x">' } })).toBe('&lt;iframe src&#x3D;&quot;x&quot;&gt;');
  });

  it('cannot produce pdf tags from data', async () => {
    const html = await render('{{step.v}}', {
      step: { v: '<pdf-delimiter>1</pdf-delimiter><landscape_orientation>' },
    });
    expect(html.split('<pdf-delimiter>')).toHaveLength(1);
    expect(html.match('<landscape_orientation>')).toBeNull();
  });

  it('escapes = in data URI', async () => {
    expect(await render('src="{{step.photo}}"', { step: { photo: 'data:image/png;base64,AA==' } })).toBe(
      'src="data:image/png;base64,AA&#x3D;&#x3D;"',
    );
  });

  it('triple-stash is raw', async () => {
    expect(await render('{{{step.html}}}', { step: { html: '<b>x</b>' } })).toBe('<b>x</b>');
  });

  it('config variables and workflow win over data', async () => {
    expect(await render('{{publicUrl}}', { publicUrl: 'https://evil' }, { publicUrl: 'https://cfg' })).toBe('https://cfg');
    expect(await render('{{workflow.id}}', { workflow: { id: 'evil' } })).toBe('w1');
  });

  describe('currentDate', () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-03-05T10:00:00Z')));

    it('renders default and custom formats', async () => {
      expect(await render('{{currentDate}}')).toBe('05.03.2026');
      expect(await render("{{currentDate 'YYYY-MM-DD'}}")).toBe('2026-03-05');
    });

    it('works in nested blocks', async () => {
      expect(await render('{{#each items}}{{currentDate}}{{/each}}', { items: [1] })).toBe('05.03.2026');
    });

    it('cannot be spoofed by data and has no global', async () => {
      expect(await render('{{currentDate}}', { currentDate: 'spoof' })).toBe('05.03.2026');
      expect(await render('{{global.currentDate}}')).toBe('');
    });
  });

  it('does not mutate the template', async () => {
    const documentTemplate = { htmlTemplate: '{{a}}' };
    await new FileGeneratorService().createHtml({ workflow: {}, documentTemplate, document: { data: { a: 1 } } });
    expect(documentTemplate.htmlTemplate).toBe('{{a}}');
  });
});
