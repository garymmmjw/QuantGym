# QuantGuide Question

## 1174. Prepped Offer?

**Metadata**

- ID: `pNyMpVIiuFMoi7xlX4Jz`
- URL: https://www.quantguide.io/questions/prepped-offer
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: SIG
- Source: Kaushik - SIG Glassdoor
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-8-28 15:52:26 America/New_York
- Last Edited By: Gabe

### 题干

$$45\%$ of students don’t use QuantGuide, $25\%$ are heavy prep users and $30\%$ are light prep users. If the heavy prep users are twice as likely to get an offer as light prep users, and light prep users are twice as likely to get an offer as those that don’t use the platform, then what is the probability that if someone got an offer that they were a heavy prep user of QuantGuide?


### Hint

We are looking to update the probability of something given new information. What theorem can help us out here?

### 解答

Since we can see this is a conditional probability question as they give you information to try and find an associated value, let's use Bayes to solve this. We are solving for $\mathbb{P}[\text{Heavy\: User} | \text{Offer}]$. Bayes says that this value is equivalent to $$\mathbb{P}[\text{Offer} | \text{Heavy\: User}] \cdot \mathbb{P}[\text{Heavy\: User}]/\mathbb{P}[\text{Offer}]$$ In the question, we aren’t given any hard value on the probability of a person getting an offer given their usage of QuantGuide, only relational information. However, we can still use this information. Lets let $p$ be the probability a non-user gets an offer. Then the probability that a light user gets an offer is $2p$ and the probability a heavy user gets an offer is $4p$. Thus, our Bayes equation becomes 
$$\\
4p\cdot0.25/(4p\cdot0.25+2p\cdot0.3+p\cdot0.45) = \dfrac{20}{41}
$$

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "20/41"
    ],
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "pNyMpVIiuFMoi7xlX4Jz",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-28 15:52:26 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9767195,
    "source": "Kaushik - SIG Glassdoor",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Prepped Offer?",
    "topic": "probability",
    "urlEnding": "prepped-offer",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "SIG"
      }
    ],
    "difficulty": "easy",
    "id": "pNyMpVIiuFMoi7xlX4Jz",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Prepped Offer?",
    "topic": "probability",
    "urlEnding": "prepped-offer"
  }
}
```
