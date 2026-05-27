# QuantGuide Question

## 167. Eight Dice

**Metadata**

- ID: `DR0AcMBBJBXHVlTF7kzj`
- URL: https://www.quantguide.io/questions/eight-dice
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: N/A
- Tags: Combinatorics
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

$$8$ fair standard $6$-sided dice are thrown, the probability that the sum of the numbers on the top faces is $12$ can be written as $\frac{x}{6^8}$. What is $x$?

### Hint

A Stars and Bars approach may be useful here. Furthermore, this problem can be thought of as allocating 12 dots to 8 dice.

### 解答

Let each die roll take its minimum value of 1 for a total sum of 8. We have 4 "dice dots" left to distribute to the 8 dice in order for the sum to be 12. This is analogous to the number of ways that 4 non-unique balls can be placed into 8 distinct boxes, which is: 

$${{8+4-1} \choose {8-1}} = {11 \choose 7} = 330$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "330"
    ],
    "difficulty": "medium",
    "id": "DR0AcMBBJBXHVlTF7kzj",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 1248693,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Eight Dice",
    "topic": "brainteasers",
    "urlEnding": "eight-dice"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "DR0AcMBBJBXHVlTF7kzj",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Combinatorics"
      }
    ],
    "title": "Eight Dice",
    "topic": "brainteasers",
    "urlEnding": "eight-dice"
  }
}
```
