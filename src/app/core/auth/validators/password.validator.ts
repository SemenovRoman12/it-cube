import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';

    if (!value) {
      return null;
    }

    const errors: ValidationErrors = {};

    if (value.length < 6) {
      errors['minLength'] = true;
    }

    if (/[^a-zA-Z0-9!@#$%^&*_+\-=]/.test(value)) {
      errors['invalidChars'] = true;
    }

    if (!/[A-Z]/.test(value)) {
      errors['noUppercase'] = true;
    }

    if (!/[a-z]/.test(value)) {
      errors['noLowercase'] = true;
    }

    if (!/[0-9]/.test(value)) {
      errors['noDigit'] = true;
    }

    if (!/[!@#$%^&*_+\-=]/.test(value)) {
      errors['noSpecialChar'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}
