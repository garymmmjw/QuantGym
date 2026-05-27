# QuantGuide Question

## 1000. Wire Connection

**Metadata**

- ID: `P0eZW5tp82z8scrBaGoX`
- URL: https://www.quantguide.io/questions/wire-connection
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: SIG
- Source: SIG
- Tags: Combinatorics, Events
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

10 wires each of length 1 mile lay parallel to each other. Electrician A can only see one side of the wires, while Electrician B can only see the other side of the wires. They randomly connect pairs of distinct wire ends until all ends are accounted for. What is the probability that the connections form a closed circuit with total length 10 miles?

### Hint

There are 10 ends on the left side of the wires and 10 ends on the right side of the wires. Without loss of generality, we connect the right end of the first wire to the right end of the second wire. In order to retain the possibility of forming a 10 mile loop, there are 8 possible left wire ends with which the left end of the second wire can join with, out of a possible 9.

### 解答

There are 10 ends on the left side of the wires and 10 ends on the right side of the wires. Without loss of generality, we connect the right end of the first wire to the right end of the second wire. In order to retain the possibility of forming a 10 mile loop, there are 8 possible left wire ends with which the left end of the second wire can join with, out of a possible 9. Without loss of generality, we connect the left end of the second wire to the left end of the third wire. The right end of the third wire can then be joined with any other remaining wire's right end. Back to the left end. There are 7 remaining ends on the left side. Of these, 6 are viable connections. Repeating this process, we get a final answer of $$\frac{8}{9} \cdot \frac{6}{7} \cdot \frac{4}{5} \cdot \frac{2}{3} = \frac{128}{315}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "128/315"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "P0eZW5tp82z8scrBaGoX",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 8169618,
    "randomizable": "",
    "source": "SIG",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Wire Connection",
    "topic": "probability",
    "urlEnding": "wire-connection"
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "P0eZW5tp82z8scrBaGoX",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Combinatorics"
      },
      {
        "tag": "Events"
      }
    ],
    "title": "Wire Connection",
    "topic": "probability",
    "urlEnding": "wire-connection"
  }
}
```
