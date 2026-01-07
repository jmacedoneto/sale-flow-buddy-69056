-- Função para calcular N dias úteis à frente (ignora sábado e domingo)
CREATE OR REPLACE FUNCTION public.calcular_dias_uteis(data_base date, n_dias integer DEFAULT 3)
RETURNS date
LANGUAGE plpgsql
AS $function$
DECLARE
  resultado date := data_base;
  contador integer := 0;
  dia_semana int;
BEGIN
  WHILE contador < n_dias LOOP
    resultado := resultado + interval '1 day';
    dia_semana := EXTRACT(DOW FROM resultado);
    IF dia_semana NOT IN (0, 6) THEN
      contador := contador + 1;
    END IF;
  END LOOP;
  RETURN resultado;
END;
$function$;