# QuantGuide Question

## 171. Dice Order III

**Metadata**

- ID: `tm602UhWY1f2r87JeOTx`
- URL: https://www.quantguide.io/questions/dice-order-iii
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: Squarepoint Capital
- Source: N/A
- Tags: Conditional Expectation, Discrete Random Variables
- Premium: True
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:01:09 America/New_York
- Last Edited By: Gabe

### 题干

You roll three fair dice. On average, what will the minimum of the three rolls be?

### Hint

Imagine a $6 \times 6 \times 6$ cube where each axis records the value of a die such that each of the 216 voxels represents a possible, equally probable outcome. For the minimum to be exactly $x$, which set of voxels are possible?

### 解答

An analytical approach is possible, but a more visual, and perhaps more elegant, approach will be provided. Imagine a $6 \times 6 \times 6$ cube where each axis records the value of a die such that each of the 216 voxels represents a possible, equally probable outcome. For example the voxel $(3,5,1)$ represents rolling 3 on the first die, 5 on the second die, and 1 on the third die. The set of outcomes where the minimum value is 6 is simply (6,6,6). The set of outcomes where the minimum is exactly 5 is the sub-cube from (5,5,5) to (6,6,6) minus the (6,6,6) voxel; in total, there are $2^3-1^3=7$ possibilities. The set of outcomes where the minimum is exactly 4 is the sub-cube from (4,4,4) to (6,6,6) minus the (5,5,5) to (6,6,6) sub-cube; in total, there are $3^3-2^3=7$ possibilities. The pattern is becoming clear. For the minimum to be exactly $x$ of $n$ $d$-sided dice, the number of possibilities is:$$(d-x+1)^n - (d-x)^n$$Solving for each event's probability, we find the expected value of the minimum of three dice rolls to be:$$\frac{1}{216}(6) + \frac{7}{216}(5) + \frac{19}{216}(4) + \frac{37}{216}(3) + \frac{61}{216}(2) + \frac{91}{216}(1) = \frac{49}{24}$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "49/24"
    ],
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "tm602UhWY1f2r87JeOTx",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:01:09 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1303660,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Dice Order III",
    "topic": "probability",
    "urlEnding": "dice-order-iii",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Squarepoint Capital"
      }
    ],
    "difficulty": "hard",
    "id": "tm602UhWY1f2r87JeOTx",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Conditional Expectation"
      },
      {
        "tag": "Discrete Random Variables"
      }
    ],
    "title": "Dice Order III",
    "topic": "probability",
    "urlEnding": "dice-order-iii"
  }
}
```
