import { describe, expect, it } from 'vitest';
import { parseSvrl } from './svrl.js';

const wrap = (inner: string) =>
  `<svrl:schematron-output xmlns:svrl="http://purl.oclc.org/dsdl/svrl">${inner}</svrl:schematron-output>`;

describe('parseSvrl', () => {
  it('parses a fatal failed-assert', () => {
    const svrl = wrap(
      '<svrl:failed-assert id="ibr-co-16" flag="fatal" location="/Invoice[1]"><svrl:text>Amount due is wrong.</svrl:text></svrl:failed-assert>',
    );
    expect(parseSvrl(svrl)).toEqual([
      {
        ruleId: 'ibr-co-16',
        severity: 'fatal',
        path: '/Invoice[1]',
        message: 'Amount due is wrong.',
      },
    ]);
  });

  it('treats a successful-report as a warning by default', () => {
    const svrl = wrap(
      '<svrl:successful-report id="ibr-info-1" location="/Invoice"><svrl:text>Heads up.</svrl:text></svrl:successful-report>',
    );
    expect(parseSvrl(svrl)[0]?.severity).toBe('warning');
  });

  it('maps an explicit warning flag', () => {
    const svrl = wrap(
      '<svrl:failed-assert id="w-1" flag="warning"><svrl:text>warn</svrl:text></svrl:failed-assert>',
    );
    expect(parseSvrl(svrl)[0]?.severity).toBe('warning');
  });

  it('maps a role attribute when no flag is present', () => {
    const svrl = wrap(
      '<svrl:successful-report id="r-1" role="fatal"><svrl:text>x</svrl:text></svrl:successful-report>',
    );
    expect(parseSvrl(svrl)[0]?.severity).toBe('fatal');
  });

  it('handles missing id and text gracefully', () => {
    const svrl = wrap('<svrl:failed-assert flag="fatal"/>');
    expect(parseSvrl(svrl)[0]).toEqual({
      ruleId: 'unknown',
      severity: 'fatal',
      path: '',
      message: '',
    });
  });

  it('returns an empty array for a clean report', () => {
    expect(parseSvrl(wrap(''))).toEqual([]);
  });

  it('collects multiple asserts', () => {
    const svrl = wrap(
      '<svrl:failed-assert id="a" flag="fatal"><svrl:text>a</svrl:text></svrl:failed-assert>' +
        '<svrl:failed-assert id="b" flag="fatal"><svrl:text>b</svrl:text></svrl:failed-assert>',
    );
    expect(parseSvrl(svrl).map((m) => m.ruleId)).toEqual(['a', 'b']);
  });
});
