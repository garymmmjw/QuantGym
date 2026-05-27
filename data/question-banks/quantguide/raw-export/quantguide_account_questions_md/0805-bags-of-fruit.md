# QuantGuide Question

## 805. Bags of Fruit

**Metadata**

- ID: `RKGIBKvafmjbzimXOaUm`
- URL: https://www.quantguide.io/questions/bags-of-fruit
- Topic: brainteasers
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: N/A
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

You are given three bags of fruits. One has apples in it; one has oranges in it; one has a mix of apples and oranges. Each bag has a label on it ("apple", "orange", or "mix"). Unfortunately, your teacher tells you that all bags are mislabeled. In order to identify the bags correctly, you develop a strategic way of picking fruits from the mislabeled bags. What is the minimum number of fruits that we need to pick from the bags to correctly identify the bags?

### Hint

There is symmetry in this problem. What is the difference between the bag labeled "apple" and the bag labeled "orange"?

### 解答

The key here is to use the fact that all bags are mislabeled. For example, the bag labeled "mix" must contain either only apples or only oranges. Note how the bags labeled "apple" and "orange" are symmetric, and thus we choose a fruit from the "mix" bag. Without loss of generality, if the fruit we get is an apple, then we know that the "mix" bag is truly the "apple" bag. We are left to identify the true "mix" and "orange" labels from the mislabeled "apple" and "orange" bags. Because we know that all bags are mislabeled, the oranges must be in the "apple" bag, not the "orange" bag, and the mixed fruit are in the "orange" bag. Note we only picked one fruit from the "mix" bag.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1"
    ],
    "difficulty": "easy",
    "id": "RKGIBKvafmjbzimXOaUm",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 6588378,
    "source": "",
    "status": "published",
    "tags": [],
    "title": "Bags of Fruit",
    "topic": "brainteasers",
    "urlEnding": "bags-of-fruit"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "RKGIBKvafmjbzimXOaUm",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [],
    "title": "Bags of Fruit",
    "topic": "brainteasers",
    "urlEnding": "bags-of-fruit"
  }
}
```
