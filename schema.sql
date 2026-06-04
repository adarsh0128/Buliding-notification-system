CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR NOT NULL,
  product_name VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'shipped', 'delivered')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_set_updated_at ON orders;

CREATE TRIGGER trg_orders_set_updated_at
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_orders_updated_at();

CREATE OR REPLACE FUNCTION notify_order_change()
RETURNS TRIGGER AS $$
DECLARE
  row_data JSON;
  payload JSON;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data = row_to_json(OLD);
  ELSE
    row_data = row_to_json(NEW);
  END IF;

  payload = json_build_object(
    'event', TG_OP,
    'data', row_data
  );

  PERFORM pg_notify('order_changes', payload::TEXT);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_order_change ON orders;

CREATE TRIGGER trg_notify_order_change
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_change();

INSERT INTO orders (customer_name, product_name, status)
VALUES
  ('John Carter', 'Laptop', 'pending'),
  ('Maya Patel', 'Monitor', 'shipped'),
  ('Alex Rivera', 'Keyboard', 'delivered')
ON CONFLICT DO NOTHING;
