---
meta:
  title: GCN - Client Configuration
---

# Client Configuration

Note that these instructions will get a bit simpler once:

1. Changes are in upstream packages and deployed, and
2. We have nice domain names for all of our resources.

## hop-client

To install [hop-client](https://pypi.org/project/hop-client/):

```sh
# pip install hop-client  # once upstream packages are deployed
pip install --extra-index-url https://asd.gsfc.nasa.gov/Leo.Singer/pypi hop-client==0.5.1.dev38+g8eeac6f adc_streaming==2.0.1.dev2+ga84d01f confluent-kafka==1.8.3+bleeding.edge
```

```sh
$ hop auth add
Username: ...
Password: ...
Hostname (may be empty): GcnKa-Front-IHEMYJWGHZXT-d9d5d67a1752570b.elb.us-east-1.amazonaws.com
Token endpoint (empty if not applicable): https://gcn-tokens.auth.us-east-1.amazoncognito.com/oauth2/token
$ hop subscribe kafka://GcnKa-Front-IHEMYJWGHZXT-d9d5d67a1752570b.elb.us-east-1.amazonaws.com/foobar
```

## adc-streaming

To install [adc-streaming](https://pypi.org/project/adc-streaming/):

```sh
# pip install adc-streaming  # once upstream packages are deployed
pip install --extra-index-url https://asd.gsfc.nasa.gov/Leo.Singer/pypi adc_streaming==2.0.1.dev2+ga84d01f confluent-kafka==1.8.3+bleeding.edge
```

Python sample code:

```python
from adc.consumer import Consumer, ConsumerConfig, SASLAuth
from uuid import uuid4

# Fill in client credentials here
client_id = '...'
client_secret = '...'

auth = SASLAuth(
    client_id, client_secret,
    token_endpoint='https://gcn-tokens.auth.us-east-1.amazoncognito.com/oauth2/token')

config = ConsumerConfig(
    broker_urls=['GcnKa-Front-IHEMYJWGHZXT-d9d5d67a1752570b.elb.us-east-1.amazonaws.com'],
    group_id=str(uuid4()), auth=auth)

consumer = Consumer(config)
consumer.subscribe('foobar')
for message in consumer.stream():
    print(message.value())
```

## confluent-kafka

To install [confluent-kafka](https://pypi.org/project/confluent-kafka/):

```sh
# pip install confluent-kafka  # once upstream packages are deployed
pip install --extra-index-url https://asd.gsfc.nasa.gov/Leo.Singer/pypi confluent-kafka==1.8.3+bleeding.edge
```

Python sample code:

```python
from confluent_kafka import Consumer
from uuid import uuid4

# Fill in client credentials here
client_id = '...'
client_secret = '...'

config = {
    'sasl.oauthbearer.client.id': client_id,
    'sasl.oauthbearer.client.secret': client_secret,
    'bootstrap.servers': 'GcnKa-Front-IHEMYJWGHZXT-d9d5d67a1752570b.elb.us-east-1.amazonaws.com',
    'sasl.oauthbearer.token.endpoint.url': 'https://gcn-tokens.auth.us-east-1.amazoncognito.com/oauth2/token',
    'sasl.mechanisms': 'OAUTHBEARER',
    'sasl.oauthbearer.method': 'oidc',
    'security.protocol': 'sasl_ssl',
    'group.id': str(uuid4())
}

consumer = Consumer(config)
consumer.subscribe(['foobar'])
for message in consumer.consume():
    print(message.value())
```