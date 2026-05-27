# QuantGuide Question

## 632. Ferry Stops

**Metadata**

- ID: `sMNKf2e7aYhREZ0dZj8Z`
- URL: https://www.quantguide.io/questions/ferry-stops
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: 2
- Companies: Jane Street, IMC, SIG
- Source: js gd
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 3
- Last Edited: 2023-11-5 00:39:15 America/New_York
- Last Edited By: Gabe

### 题干

There are an unknown amount of people on a ferry. After the first stop, $\dfrac{3}{4}$ of them get off and $7$ people get on. This happens again at $2$ more stops. After this process, what is the minimum amount of possible people that could be aboard the ferry? 

### Hint

Let be the amount of people we started with. After the first round, there are $\dfrac{1}{4}x + 7$ people on the ferry. Iterate this and find the smallest $x$ so that the result is an integer

### 解答

Let be the amount of people we started with. After the first round, there are $\dfrac{1}{4}x + 7$ people on the ferry. After the second stop, there are $$\dfrac{1}{4}\left(\dfrac{1}{4}x + 7\right) + 7 = \dfrac{1}{16}x + \dfrac{35}{4}$$ After the last stop, there are $$\dfrac{1}{4}\left(\dfrac{1}{16}x + \dfrac{35}{4}\right) + 7 = \dfrac{1}{64}x + \dfrac{147}{16} = \dfrac{x + 588}{64}$$ people on the ferry. We must find the smallest integer $x$ such that $x+588$ is divisible by $64$. Note that $10 \cdot 64 = 640$, which is the smallest integer larger than $588$ that is divisible by $64$. Thus, there are $640 - 588 = 52$ people on the ferry at the start, meaning there are $10$ people on at the end.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "10"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "sMNKf2e7aYhREZ0dZj8Z",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 00:39:15 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 5031408,
    "source": "js gd",
    "status": "published",
    "tags": [],
    "title": "Ferry Stops",
    "topic": "brainteasers",
    "urlEnding": "ferry-stops",
    "version": 3
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "IMC"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "sMNKf2e7aYhREZ0dZj8Z",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Ferry Stops",
    "topic": "brainteasers",
    "urlEnding": "ferry-stops"
  }
}
```
