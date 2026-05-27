# QuantGuide Question

## 1187. Mossel's Dice

**Metadata**

- ID: `c51jJpRsfdrHJsptKxcz`
- URL: https://www.quantguide.io/questions/mossels-dice-problem
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: Elchanan Mossel's Famous Dice Problem
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-11-10 13:28:34 America/New_York
- Last Edited By: Gabe

### 题干

You roll a fair $6-$sided die until you get $6$. What is the expected number of rolls (including the roll giving $6$) performed conditioned on the event that all rolls show even numbers?

### Hint

Denote two random variables: $X$, which is the expected number of rolls until we roll a number other than 2 or 4, and $l$, which takes on the value of the last roll. We want $\mathbb{E}[X \mid l=6]$. 

### 解答

First, imagine what such a sequence may look like, perhaps something like $242242\dots6$ so we are equivalently asking what is the expected number of times we can roll a $2$ or $4$ until we roll some other number conditioned on that other number being $6$. $$$$ More formally, let $X$ be the expected number of rolls until we roll a number other than $2$ or $4$. Let $l$ be equal to the last number, so we want $E[X \mid l= 6]$. Since the rolls are independent, $X$ and $l$ are independent of one another which means that $E[X \mid l = 6] = E[X]$ and now $X$ is simply a geometric random variable parameter $p=\frac{2}{3}$ so $\mathbb{E}[X] = \frac{3}{2}$. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1.5",
      "3/2"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "c51jJpRsfdrHJsptKxcz",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-10 13:28:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9860354,
    "source": "Elchanan Mossel's Famous Dice Problem",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Mossel's Dice",
    "topic": "probability",
    "urlEnding": "mossels-dice-problem",
    "version": 2
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "c51jJpRsfdrHJsptKxcz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Mossel's Dice",
    "topic": "probability",
    "urlEnding": "mossels-dice-problem"
  }
}
```
