import {
  decimal,
  numericMath,
  type DecimalValue,
  type SexagesimalValue
} from './value';

function asDecimal(value: unknown): DecimalValue {
  return value as DecimalValue;
}

function padInteger(value: DecimalValue): string {
  const text = value.toFixed(0);
  return text.length < 2 ? '0' + text : text;
}

export function dmsToDecimalDegrees(
  degrees: string | number | DecimalValue,
  minutes: string | number | DecimalValue = 0,
  seconds: string | number | DecimalValue = 0
): DecimalValue {
  const degreeValue = decimal(typeof degrees === 'object' ? degrees.toString() : degrees);
  const minuteValue = decimal(typeof minutes === 'object' ? minutes.toString() : minutes);
  const secondValue = decimal(typeof seconds === 'object' ? seconds.toString() : seconds);

  if (numericMath.smaller(minuteValue, 0) || numericMath.largerEq(minuteValue, 60)) {
    throw new RangeError('DMS minutes must be in the range 0 to less than 60.');
  }
  if (numericMath.smaller(secondValue, 0) || numericMath.largerEq(secondValue, 60)) {
    throw new RangeError('DMS seconds must be in the range 0 to less than 60.');
  }

  const sign = numericMath.smaller(degreeValue, 0) ? -1 : 1;
  const absoluteDegrees = numericMath.abs(degreeValue);
  const fractionalDegrees = numericMath.divide(minuteValue, 60);
  const fractionalMinutes = numericMath.divide(secondValue, 3600);
  const total = numericMath.add(absoluteDegrees, numericMath.add(fractionalDegrees, fractionalMinutes));
  return asDecimal(sign < 0 ? numericMath.unaryMinus(total) : total);
}

export function decimalDegreesToDms(value: string | number | DecimalValue, precision = 2): SexagesimalValue {
  if (!Number.isInteger(precision) || precision < 0 || precision > 12) {
    throw new RangeError('DMS precision must be an integer from 0 to 12.');
  }

  const source = decimal(typeof value === 'object' ? value.toString() : value);
  const negative = numericMath.smaller(source, 0);
  const absolute = numericMath.abs(source);
  const wholeDegrees = asDecimal(numericMath.floor(absolute));
  const fractionalDegrees = numericMath.subtract(absolute, wholeDegrees);
  const totalMinutes = numericMath.multiply(fractionalDegrees, 60);
  const wholeMinutes = asDecimal(numericMath.floor(totalMinutes));
  const fractionalMinutes = numericMath.subtract(totalMinutes, wholeMinutes);
  const secondsScale = numericMath.pow(10, precision);
  let seconds = asDecimal(numericMath.divide(
    numericMath.round(numericMath.multiply(numericMath.multiply(fractionalMinutes, 60), secondsScale)),
    secondsScale
  ));
  let degrees = wholeDegrees;
  let minutes = wholeMinutes;

  if (numericMath.largerEq(seconds, 60)) {
    seconds = decimal(0);
    minutes = asDecimal(numericMath.add(minutes, 1));
  }
  if (numericMath.largerEq(minutes, 60)) {
    minutes = decimal(0);
    degrees = asDecimal(numericMath.add(degrees, 1));
  }

  const sign = negative ? '-' : '';
  const degreeText = sign + degrees.toFixed(0);
  const minuteText = padInteger(minutes);
  const secondsText = seconds.toFixed(precision).padStart(precision > 0 ? precision + 3 : 2, '0');

  return {
    kind: 'sexagesimal',
    totalDegrees: source,
    degrees: degreeText,
    minutes: minuteText,
    seconds: secondsText
  };
}

export function createSexagesimalValue(
  degrees: string,
  minutes = '0',
  seconds = '0'
): SexagesimalValue {
  const totalDegrees = dmsToDecimalDegrees(degrees, minutes, seconds);
  return {
    kind: 'sexagesimal',
    totalDegrees,
    degrees: decimalDegreesToDms(totalDegrees, 0).degrees,
    minutes: decimalDegreesToDms(totalDegrees, 0).minutes,
    seconds: decimalDegreesToDms(totalDegrees, 2).seconds
  };
}

export function formatDms(value: string | number | DecimalValue, precision = 2): string {
  const parts = decimalDegreesToDms(value, precision);
  return parts.degrees + '° ' + parts.minutes + '′ ' + parts.seconds + '″';
}

export function sexagesimalToDecimal(value: SexagesimalValue): DecimalValue {
  return value.totalDegrees;
}
