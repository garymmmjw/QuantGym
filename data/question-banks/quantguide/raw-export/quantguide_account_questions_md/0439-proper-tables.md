# QuantGuide Question

## 439. Proper Tables

**Metadata**

- ID: `eNPUT4ariQkUI5tpR5u4`
- URL: https://www.quantguide.io/questions/proper-tables
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 3
- Companies: N/A
- Source: N/A
- Tags: Continuous Random Variables
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-7 08:36:54 America/New_York
- Last Edited By: Gabe

### 题干

Three points are randomly selected uniformly at random on the circumference of a circular slab. Then, 3 table legs are attached vertically at those three points. For this table to be "proper", no two legs can be within 90 degrees of one another. What is the probability that this table is "proper"?

### Hint

Fix the first leg arbitrarily. How much of the table is banned from having more legs in it? The valid placement region for the third leg depends on the second leg location. Condition on the location of the second leg and use symmetry of the region and the fact our distribution is uniform.


### 解答

Attach the first leg of the table at an arbitrary position. Since the density is uniform, we do not need to worry about anything. Now, we know that the other legs can't be within 90 degrees of the first leg. Therefore, we can imagine shading out a region spanning 90 degrees in each direction emanating from the first leg location. This shades out half of the table. From this point on, it may be helpful to get a piece of paper and draw all of this out to convince yourself of the arguments below.

$$$$

Now, we need to ensure that the remaining two legs are not within 90 degrees of one another. However, this probability is dependent upon the location of the second leg. This is because wherever we place the second leg, there is going to be some overlap potentially in the region that is shaded out because of it. How much overlap there is depends on how far away the first leg is from the second. We know that the valid range to put the second leg is $90$ to $270$ degrees (all orientations are assumed to be CCW) away from the first. By the symmetry of our region and our uniform distribution of the points, as the region that is available to place the third point in is equal in length (and hence probability) if we put the second at $180 + x$ versus $180 - x$, we can just consider the region $90$ to $180$ degrees away from the first point and double it to get the total probability.

$$$$

If we place our second leg at $90 + x$ degrees, $0 < x < 90$, then there are $90-x$ degrees remaining at which we can place the third leg. Therefore, by using continuous version of Law of Total Probability the probability we are interested in is $\displaystyle \int_0^{90} 2 \cdot \dfrac{1}{360} \cdot \dfrac{90-x}{360}dx$. Recall that the $2$ is because we double to account for the other region of $180$ to $270$ degrees away CCW. Therefore, $\dfrac{2}{360^2} \displaystyle \int_0^{90} 90 - xdx = \dfrac{1}{16}$, which is our solution.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/16"
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "eNPUT4ariQkUI5tpR5u4",
    "internalDifficulty": 3,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-7 08:36:54 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3497040,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Proper Tables",
    "topic": "probability",
    "urlEnding": "proper-tables",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "hard",
    "id": "eNPUT4ariQkUI5tpR5u4",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Proper Tables",
    "topic": "probability",
    "urlEnding": "proper-tables"
  }
}
```
