# QuantGuide Question

## 1152. Water Measurement

**Metadata**

- ID: `A5BbPdI3frVxnUIwJCiu`
- URL: https://www.quantguide.io/questions/water-measurement
- Topic: brainteasers
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-1 09:50:47 America/New_York
- Last Edited By: Gabe

### 题干

A maid was sent to the brook with two vessels that exactly measured $7$ pints and $11$ pints exactly. She had to bring back exactly $2$ pints of water. What is the smallest possible number of transactions necessary? A transaction is filling a vessel, emptying it, or pouring from one vessel to another. In other words, you cannot transfer a proportion of the vessel. You must transfer all of it. 

### Hint

Keep track of the $7$-pint and $11$-pint vessels. What sequence of transactions gets you to $2$ pints in one of the vessels? 

### 解答

Let $V_7$ and $V_{11}$ denote the $7$-pint and $11$-pint vessels respectively. In the below, the successive lines indicate the status of each of $V_7$ and $V_{11}$:

$$\begin{array}{c|c} V_7 & V_{11} \\ \hline
7 & 0 \\ 0 & 7 \\ 7 & 7 \\ 3 & 11 \\ 3 & 0 \\ 0 & 3 \\ 7 & 3 \\ 0 & 10 \\ 7 & 10 \\ 6 & 11 \\ 6 & 0 \\ 0 & 6 \\ 7 & 6 \\ 2 & 11 \\ \end{array}$$

It is seen that the required $2$ pints are in the $7$-pint vessel. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "14"
    ],
    "companies": [],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "A5BbPdI3frVxnUIwJCiu",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-1 09:50:47 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9528733,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Water Measurement",
    "topic": "brainteasers",
    "urlEnding": "water-measurement",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "hard",
    "id": "A5BbPdI3frVxnUIwJCiu",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Water Measurement",
    "topic": "brainteasers",
    "urlEnding": "water-measurement"
  }
}
```
