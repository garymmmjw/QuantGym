# QuantGuide Question

## 161. Paired Pumpkins II

**Metadata**

- ID: `eLuzLsw6UdMAgUfqVoyy`
- URL: https://www.quantguide.io/questions/paired-pumpkins-ii
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Jane Street, SIG
- Source: Kaushik - JS Glassdoor
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 4
- Last Edited: 2023-9-30 18:27:28 America/New_York
- Last Edited By: Gabe

### 题干

Dracula has $5$ pumpkins. When he pairs any two pumpkins, they weigh $21, 22, \dots,30$ pounds. What's the sum of the weights of all the pumpkins?

### Hint

Is there anything you can do with all the paired weights to directly solve for the sum of all the pumpkins?

### 解答

Let $a, b, c, d,$ and $e$ be the weight of each pumpkin from lightest to heaviest. If we sum all the pairwise weights, we know we will have 4 sets of $a, b, c, d,$ and $e$. Thus $$4\cdot(a+b+c+d+e)=21+\dots+30=255$$ or $$a+b+c+d+e=\frac{255}{4}$$
You could also create equations for all the pairs to find the weights of each pumpkin but the question only asks for the sum of the weights and the above method is a clever way of reaching the answer.


### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "255/4"
    ],
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "eLuzLsw6UdMAgUfqVoyy",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-30 18:27:28 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 1223757,
    "source": "Kaushik - JS Glassdoor",
    "status": "published",
    "tags": [],
    "title": "Paired Pumpkins II",
    "topic": "brainteasers",
    "urlEnding": "paired-pumpkins-ii",
    "version": 4
  },
  "list_summary": {
    "companies": [
      {
        "company": "Jane Street"
      },
      {
        "company": "SIG"
      }
    ],
    "difficulty": "medium",
    "id": "eLuzLsw6UdMAgUfqVoyy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Paired Pumpkins II",
    "topic": "brainteasers",
    "urlEnding": "paired-pumpkins-ii"
  }
}
```
