import {
  decimal,
  numericMath,
  type ComplexValue,
  type DecimalValue,
  type NumericInput
} from './value';

function result(value: unknown): DecimalValue {
  return value as DecimalValue;
}

export function complex(real: NumericInput, imaginary: NumericInput = 0): ComplexValue {
  return {
    kind: 'complex',
    real: decimal(real),
    imaginary: decimal(imaginary)
  };
}

export function complexAdd(left: ComplexValue, right: ComplexValue): ComplexValue {
  return complex(
    result(numericMath.add(left.real, right.real)),
    result(numericMath.add(left.imaginary, right.imaginary))
  );
}

export function complexSubtract(left: ComplexValue, right: ComplexValue): ComplexValue {
  return complex(
    result(numericMath.subtract(left.real, right.real)),
    result(numericMath.subtract(left.imaginary, right.imaginary))
  );
}

export function complexMultiply(left: ComplexValue, right: ComplexValue): ComplexValue {
  const real = numericMath.subtract(
    numericMath.multiply(left.real, right.real),
    numericMath.multiply(left.imaginary, right.imaginary)
  );
  const imaginary = numericMath.add(
    numericMath.multiply(left.real, right.imaginary),
    numericMath.multiply(left.imaginary, right.real)
  );
  return complex(result(real), result(imaginary));
}

export function complexDivide(left: ComplexValue, right: ComplexValue): ComplexValue {
  const denominator = numericMath.add(
    numericMath.multiply(right.real, right.real),
    numericMath.multiply(right.imaginary, right.imaginary)
  );
  if (numericMath.equal(denominator, 0)) throw new RangeError('Division by the complex number zero is undefined.');

  const realNumerator = numericMath.add(
    numericMath.multiply(left.real, right.real),
    numericMath.multiply(left.imaginary, right.imaginary)
  );
  const imaginaryNumerator = numericMath.subtract(
    numericMath.multiply(left.imaginary, right.real),
    numericMath.multiply(left.real, right.imaginary)
  );
  return complex(
    result(numericMath.divide(realNumerator, denominator)),
    result(numericMath.divide(imaginaryNumerator, denominator))
  );
}

export function complexConjugate(value: ComplexValue): ComplexValue {
  return complex(value.real, result(numericMath.unaryMinus(value.imaginary)));
}

export function complexMagnitude(value: ComplexValue): DecimalValue {
  const squared = numericMath.add(
    numericMath.multiply(value.real, value.real),
    numericMath.multiply(value.imaginary, value.imaginary)
  );
  return result(numericMath.sqrt(squared));
}

export function complexArgument(value: ComplexValue): DecimalValue {
  if (numericMath.equal(value.real, 0) && numericMath.equal(value.imaginary, 0)) {
    throw new RangeError('The argument of zero is undefined.');
  }
  return result(numericMath.atan2(value.imaginary, value.real));
}

export function complexExponential(value: ComplexValue): ComplexValue {
  const magnitude = numericMath.exp(value.real);
  return complex(
    result(numericMath.multiply(magnitude, numericMath.cos(value.imaginary))),
    result(numericMath.multiply(magnitude, numericMath.sin(value.imaginary)))
  );
}

export function complexLogarithm(value: ComplexValue): ComplexValue {
  const magnitude = complexMagnitude(value);
  if (numericMath.equal(magnitude, 0)) throw new RangeError('The logarithm of zero is undefined.');
  return complex(result(numericMath.log(magnitude)), complexArgument(value));
}

export function complexSquareRoot(value: ComplexValue): ComplexValue {
  const magnitude = complexMagnitude(value);
  const realSquared = numericMath.divide(numericMath.add(magnitude, value.real), 2);
  const imaginarySquared = numericMath.divide(numericMath.subtract(magnitude, value.real), 2);
  const realPart = numericMath.sqrt(numericMath.max(0, realSquared));
  const imaginaryMagnitude = numericMath.sqrt(numericMath.max(0, imaginarySquared));
  const imaginaryPart = numericMath.smaller(value.imaginary, 0)
    ? numericMath.unaryMinus(imaginaryMagnitude)
    : imaginaryMagnitude;
  return complex(result(realPart), result(imaginaryPart));
}

export function complexPower(base: ComplexValue, exponent: ComplexValue): ComplexValue {
  if (numericMath.equal(base.real, 0) && numericMath.equal(base.imaginary, 0)) {
    if (numericMath.equal(exponent.real, 0) && numericMath.equal(exponent.imaginary, 0)) {
      return complex(1, 0);
    }
    if (!numericMath.equal(exponent.imaginary, 0) || numericMath.smaller(exponent.real, 0)) {
      throw new RangeError('Zero cannot be raised to this complex exponent.');
    }
    return complex(0, 0);
  }
  return complexExponential(complexMultiply(exponent, complexLogarithm(base)));
}

export function complexSine(value: ComplexValue): ComplexValue {
  const realPart = numericMath.multiply(numericMath.sin(value.real), numericMath.cosh(value.imaginary));
  const imaginaryPart = numericMath.multiply(numericMath.cos(value.real), numericMath.sinh(value.imaginary));
  return complex(result(realPart), result(imaginaryPart));
}

export function complexCosine(value: ComplexValue): ComplexValue {
  const realPart = numericMath.multiply(numericMath.cos(value.real), numericMath.cosh(value.imaginary));
  const imaginaryPart = numericMath.unaryMinus(
    numericMath.multiply(numericMath.sin(value.real), numericMath.sinh(value.imaginary))
  );
  return complex(result(realPart), result(imaginaryPart));
}

export function complexTangent(value: ComplexValue): ComplexValue {
  return complexDivide(complexSine(value), complexCosine(value));
}

export function complexFromPolar(radius: NumericInput, angleRadians: NumericInput): ComplexValue {
  const magnitude = decimal(radius);
  if (numericMath.smaller(magnitude, 0)) throw new RangeError('Polar radius must be non-negative.');
  const angle = decimal(angleRadians);
  return complex(
    result(numericMath.multiply(magnitude, numericMath.cos(angle))),
    result(numericMath.multiply(magnitude, numericMath.sin(angle)))
  );
}
