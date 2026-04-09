I am building a small dashboard to track things i want to track the trips my drivers have travelled per day, i want to track the money made per day, i want to give a list of locations and prices between locations (aka trips), i want this app to have two user types drivers and admins , drivers dont have to login but admins have to login, when logging in driver simply selects their name from a list and login , web app must use cookies to stay logged in, i want to save this data to supabase, i also want to track the starting KMs of petrol at start of day and the remaning KMs of petrol left at the end of the day, i want my driver to notify when they are starting their shift and when they are ending it, the web app must not be complex for drivers
 
drivers must be able to create trips and give starting area e.g Komani Central or Ezibeleni or Ilinge
on trip creation app must determine a recommended price using the pricing between locations recorded on the sytem e.g from ilinge to ezibeleni recommended price R250
when a trip is started app must auto collection geo lat long and save to trip
on trip end web app must calculate (in the background the total kms travelled for the trip using the geo location of starting point to end point)
 
when driver starts a trip they must also optionally save the cellphone number of the person they transported, they can search for an existing number or add a new one so that we can eep track of our customers but we dont need cutomer names of yet we just need the numbers
 
when the driver ends a trip they must specify the price they charged for the trip or click a button saying they used the recommended price
 
the driver must also be able to record any petrol fillups per day and how much they filled up with
 
all this information collected per trip will be useful for the admin to see how much money was made per trip or if any discounts were offered and how much petrol lost (spending) etc, how many repeat customers (loyalty)
 
the drivers app must also give recommend discounts for repeat riders using their cellphone number, this encourages repeaters to give us their information in exchange for discounts
 
the overall system must be smart about discounts and not just give discounts when we are at a loss
 
the driver at the start of their shift must be able to set a goal of the amount of money they will make that day or use the default goal of R500 the admin system must also be able to set daily goals for their drivers
 
admins must be able to see daily driver progress and activity and financials
 
admins must be able to set monthly goals for the whole driver team
admins must be able to add locations
admins must be able to set recommended prices between locations
admins must be able to add drivers
drivers when creating a trip must be able to add stop between locations