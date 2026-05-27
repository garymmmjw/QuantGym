# QuantGuide Question

## 428. Oil Transport

**Metadata**

- ID: `EUCIAzJYatcPE5oY7thW`
- URL: https://www.quantguide.io/questions/oil-transport
- Topic: brainteasers
- Difficulty: medium
- Internal Difficulty: 3
- Companies: Optiver, Akuna
- Source: Kaushik - Heard on the Street
- Tags: N/A
- Premium: False
- Solution Free: False
- Version: 5
- Last Edited: 2023-11-5 10:23:32 America/New_York
- Last Edited By: Gabe

### 题干

An oil tanker is tasked with the goal of transporting $3000$ gallons of oil from Port A to Port B which are $1000$ miles apart. However, the oil tanker loses $1$ gallon of oil for every mile it travels from spillage (at a constant rate) and can carry a max of $1000$ gallons at any time. The tanker can also dump any oil that it is carrying at any number of storage ports on the way from Port A to Port B and pick it up later. Assuming an optimal travel plan where you decide where to place any number of storage ports and how to carry the oil, how many gallons can you transport form Port A to Port B (round to the nearest gallon)?

### Hint

Where should be put our storage ports to maximize our fuel efficiency?

### 解答

The key realization in this question is how to place the storage ports to maximize the amount of oil you are carrying per oil lost. This realization leads to the idea of having multiples of $1000$ gallons at any storage port. If you don't, you aren't maximizing the efficiency metric above. Where do we place the first storage port to hold $2000$ gallons of oil? Well, we need to leave $\frac{2000}{3}$ gallons every time we arrive there from Port A. This means that the distance should be $1000-\frac{2000}{3} = \frac{1000}{3}$ miles away from Port A. If we only have this storage port, we will bring $1000-\frac{2000}{3} = \frac{1000}{3}$ gallons twice to Port B $=\frac{2000}{3}\approx 667$ gallons. But we can do better by having another storage port that is a multiple of $1000$ gallons, that being the port that will have $1000$ gallons. From the first storage port, we can go $500$ miles and drop off $500$ gallons to the second storage port twice. This means this second storage port should be located $500$ miles away from the first storage port $=500+\frac{1000}{3} = \frac{2500}{3}$ miles away from Port A. Now we have $1000$ gallons of oil that is $1000-\frac{2500}{3} = \frac{500}{3}$ miles away from Port B. We can carry these $1000$ gallons all at once and lose  $\frac{500}{3}$ gallons of oil which leaves us with $1000-\frac{500}{3}=\frac{2500}{3}\approx 833$ gallons of oil at Port B.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "833"
    ],
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EUCIAzJYatcPE5oY7thW",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-5 10:23:32 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3437372,
    "source": "Kaushik - Heard on the Street",
    "status": "published",
    "tags": [],
    "title": "Oil Transport",
    "topic": "brainteasers",
    "urlEnding": "oil-transport",
    "version": 5
  },
  "list_summary": {
    "companies": [
      {
        "company": "Optiver"
      },
      {
        "company": "Akuna"
      }
    ],
    "difficulty": "medium",
    "id": "EUCIAzJYatcPE5oY7thW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [],
    "title": "Oil Transport",
    "topic": "brainteasers",
    "urlEnding": "oil-transport"
  }
}
```
