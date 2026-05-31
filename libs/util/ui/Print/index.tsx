import { Area } from "./Area";
import { Provider, type ProviderProps } from "./Provider";
import { Trigger } from "./Trigger";

export const Print = (props: ProviderProps) => {
  return <Provider {...props} />;
};

Print.Area = Area;
Print.Trigger = Trigger;
