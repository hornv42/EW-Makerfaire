# EW-Makerfaire
Greetings Embedded Workshop People!

## TBD:
* Station creation (optional - can pre-bake)

## Starting

On first setup, cd into the directory and:

``` shell
npm install
```

to pull down dependencies.

Afterwards, run `index.js` via node:

``` shell
node index.js
```

## API Endpoints
The following endpoints are working at this time:

**Note**: Most of these will need to change slightly we need to be able to have
multiple play sessions (one per each day). But the data returned should be
similar.

### /answer (POST)
Attempt to answer a question.

This is meant to be invoked by the boxes in order to submit a user answer.

#### Spec
The caller must provide an object like:

| Name      | Type    | Description                                       |
|:----------|:--------|:--------------------------------------------------|
| userID    | integer | The ID of the user answering the question.        |
| stationID | integer | The ID of the station the user is answering from. |
| answer    | integer | The attempted answer to the question.             |

On success (HTTP 200), returns `true`, if the question was answered correcttly,
or `false`. Otherwise returns error status.

Returns HTTP 400 if user has attempted to answer the same question too many times.

#### Example

**Input**
``` json
{
  "userID": 5,
  "stationID": 2,
  "answer": 128
}
```
**Output**

``` json
true
```

### /leaderboard/\<sessionID\> (GET)
Returns an user scores, tracking the number questions they've answered correctly
and incorrectly.

#### Spec
An array of user score objects.

Each object consists of:

| Name         | Type    | Description                                               |
|:-------------|:--------|:----------------------------------------------------------|
| userID       | integer | The ID of the user                                        |
| nickName     | string  | The name of the user                                      |
| numCorrect   | integer | The number of questions the user has answered correctly   |
| numIncorrect | integer | The number of questions the user has answered incorrectly |

#### Example

``` json
[
  {
    "userID": 5,
    "nickName": "Bill",
    "numCorrect": 10,
    "numIncorrect": 5
  },
  {
    "userID": 10,
    "nickName": "Will",
    "numCorrect": 5,
    "numIncorrect": 5
  }
]
```

### /session (GET)
Returns the active session, or error if no session active.

#### Spec
Session is returned as an object:

| Name      | Type    | Description                            |
|:----------|:--------|:---------------------------------------|
| sessionID | integer | The ID of the currently active session |

#### Example

``` json
{
  "sessionID": 5
}
```

### /session (POST)
Set the currently active session

#### Spec
Session is given as:

| Name      | Type    | Description                  |
|:----------|:--------|:-----------------------------|
| sessionID | integer | The ID of the session to set |


#### Example

``` json
{
  "sessionID": 5
}
```

### /userDetail/\<sessionID\>/\<userID\> (GET)
Returns a user's detailed status, including the answers they've given at each of
the stations, as well as information about the station.

#### Spec
An object of:

| Name     | Type    | Description              |
|:---------|:--------|:-------------------------|
| userID   | integer | The ID of the user       |
| nickName | string  | The name of the user     |
| answers  | array   | A list of answer objects |

Each answer object is:

| Name      | Type    | Description                                     |
|:----------|:--------|:------------------------------------------------|
| stationID | integer | The ID of the station                           |
| x_val     | integer | The x coordinate of the station                 |
| y_val     | integer | The y coordinate of the station                 |
| timestamp | integer | The timestamp of when the answer was given      |
| correct   | boolean | A boolean indicating if the answer was correct. |

#### Example

``` json
{
  "userID": 5,
  "nickName": "Bill",
  "answers": [
    {
      "stationID": 1,
      "x_val": 0,
      "y_val": 5,
      "timestamp": 10293,
      "correct": false
    },
    {
      "stationID": 2,
      "x_val": 0,
      "y_val": 5,
      "timestamp": 15293,
      "correct": true
    },
    {
      "stationID": 5,
      "x_val": 0,
      "y_val": 5,
      "timestamp": 19393,
      "correct": true
    }
  ]
}
```

### /users (GET)
Returns registered user ID's

#### Spec
Returned data is an array of integers.

#### Example

``` json
[ 1, 2, 3 ]
```

### /users/<userID> (GET)
Returns a user object.

#### Spec
Each object consists of:

| Name     | Type    | Description          |
|:---------|:--------|:---------------------|
| userID   | integer | The ID of the user   |
| nickName | string  | The name of the user |

#### Example

``` json
{
  "userID": 5,
  "nickName": "Bob"
}
```
