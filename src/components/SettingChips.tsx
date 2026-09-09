type SettingOption<T extends string | number> = {
  value: T;
  label: string;
  description?: string;
};

type SettingChipsProps<T extends string | number> = {
  legend: string;
  name: string;
  value: T;
  options: readonly SettingOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  disabledReason?: string;
};

export function SettingChips<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled = false,
  disabledReason,
}: SettingChipsProps<T>) {
  const reasonId = disabled && disabledReason ? `${name}-disabled-reason` : undefined;

  return (
    <fieldset className="setting-group" disabled={disabled} aria-describedby={reasonId}>
      <legend>{legend}</legend>
      <div className="setting-chips">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label key={option.value} className="setting-chip">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
              />
              <span className="setting-chip__body">
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
            </label>
          );
        })}
      </div>
      {reasonId ? <p id={reasonId} className="control-reason">{disabledReason}</p> : null}
    </fieldset>
  );
}
